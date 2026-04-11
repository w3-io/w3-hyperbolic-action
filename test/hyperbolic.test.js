/**
 * HyperbolicClient unit tests.
 *
 * Mocks `fetch` globally so we can test the client without hitting
 * the real Hyperbolic API. Each test installs a fetch mock, runs
 * a client method, and asserts on:
 *
 *   - the URL the client called
 *   - the request method, headers, and body
 *   - the parsed result the client returned
 *   - the W3ActionError code on failure paths
 *
 * Run with: npm test
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { HyperbolicClient } from '../src/hyperbolic.js'
import { W3ActionError } from '@w3-io/action-core'

const CHAT_RESPONSE = {
  id: 'chatcmpl-abc123',
  object: 'chat.completion',
  created: 1710756000,
  model: 'deepseek-ai/DeepSeek-V3',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'The capital of France is Paris.',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 12,
    completion_tokens: 8,
    total_tokens: 20,
  },
}

const IMAGE_RESPONSE = {
  images: [
    {
      image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ',
      seed: 42,
    },
  ],
}

const AUDIO_RESPONSE = {
  audio: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKw=',
}

let originalFetch
let calls

beforeEach(() => {
  originalFetch = global.fetch
  calls = []
})

afterEach(() => {
  global.fetch = originalFetch
})

/**
 * Install a fetch mock that returns the supplied responses in order.
 * Each response is an object with at least { status, body }.
 */
function mockFetch(responses) {
  let index = 0
  global.fetch = async (url, options) => {
    calls.push({ url, options })
    const response = responses[index++]
    if (!response) {
      throw new Error(`Unexpected fetch call ${index}: ${url}`)
    }
    const status = response.status ?? 200
    const ok = status >= 200 && status < 300
    return {
      ok,
      status,
      headers: new Map([['content-type', 'application/json']]),
      text: async () =>
        typeof response.body === 'string' ? response.body : JSON.stringify(response.body ?? {}),
      json: async () => response.body ?? {},
    }
  }
}

describe('HyperbolicClient: construction', () => {
  it('requires an api key', () => {
    assert.throws(
      () => new HyperbolicClient({}),
      (err) => err instanceof W3ActionError && /API key is required/.test(err.message),
    )
  })

  it('strips trailing slashes from the base url', () => {
    const client = new HyperbolicClient({ apiKey: 'k', baseUrl: 'https://api.example.com///' })
    assert.equal(client.baseUrl, 'https://api.example.com')
  })
})

describe('HyperbolicClient: chat', () => {
  it('sends correct request and parses response', async () => {
    mockFetch([{ body: CHAT_RESPONSE }])
    const client = new HyperbolicClient({ apiKey: 'test-key' })

    const result = await client.chat({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [{ role: 'user', content: 'What is the capital of France?' }],
      temperature: 0.1,
    })

    assert.equal(result.content, 'The capital of France is Paris.')
    assert.equal(result.modelUsed, 'deepseek-ai/DeepSeek-V3')
    assert.equal(result.finishReason, 'stop')
    assert.equal(result.inputTokens, 12)
    assert.equal(result.outputTokens, 8)
    assert.equal(result.totalTokens, 20)

    assert.equal(calls[0].url, 'https://api.hyperbolic.xyz/v1/chat/completions')
    assert.equal(calls[0].options.method, 'POST')
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test-key')

    const body = JSON.parse(calls[0].options.body)
    assert.equal(body.model, 'deepseek-ai/DeepSeek-V3')
    assert.equal(body.temperature, 0.1)
    assert.equal(body.messages.length, 1)
  })

  it('requires model', async () => {
    const client = new HyperbolicClient({ apiKey: 'k' })
    await assert.rejects(
      () => client.chat({ messages: [{ role: 'user', content: 'hi' }] }),
      /model is required/,
    )
  })

  it('requires messages', async () => {
    const client = new HyperbolicClient({ apiKey: 'k' })
    await assert.rejects(() => client.chat({ model: 'test' }), /messages is required/)
  })

  it('passes response format for structured output', async () => {
    mockFetch([{ body: CHAT_RESPONSE }])
    const client = new HyperbolicClient({ apiKey: 'k' })

    await client.chat({
      model: 'test',
      messages: [{ role: 'user', content: 'hi' }],
      responseFormat: { type: 'json_schema', json_schema: { name: 'test', strict: true } },
    })

    const body = JSON.parse(calls[0].options.body)
    assert.equal(body.response_format.type, 'json_schema')
  })

  it('passes tools for function calling', async () => {
    mockFetch([{ body: CHAT_RESPONSE }])
    const client = new HyperbolicClient({ apiKey: 'k' })

    const tools = [{ type: 'function', function: { name: 'get_weather', parameters: {} } }]
    await client.chat({
      model: 'test',
      messages: [{ role: 'user', content: 'weather?' }],
      tools,
    })

    const body = JSON.parse(calls[0].options.body)
    assert.deepEqual(body.tools, tools)
  })

  it('omits undefined optional params', async () => {
    mockFetch([{ body: CHAT_RESPONSE }])
    const client = new HyperbolicClient({ apiKey: 'k' })

    await client.chat({
      model: 'test',
      messages: [{ role: 'user', content: 'hi' }],
    })

    const body = JSON.parse(calls[0].options.body)
    assert.equal('temperature' in body, false)
    assert.equal('top_p' in body, false)
    assert.equal('max_tokens' in body, false)
    assert.equal('seed' in body, false)
  })
})

describe('HyperbolicClient: generateImage', () => {
  it('returns base64 image', async () => {
    mockFetch([{ body: IMAGE_RESPONSE }])
    const client = new HyperbolicClient({ apiKey: 'k' })

    const result = await client.generateImage({ prompt: 'a cat' })

    assert.ok(result.imageBase64)
    assert.equal(result.seed, 42)

    const body = JSON.parse(calls[0].options.body)
    assert.equal(body.prompt, 'a cat')
    assert.equal(body.height, 1024)
    assert.equal(body.width, 1024)
  })

  it('passes LoRA config', async () => {
    mockFetch([{ body: IMAGE_RESPONSE }])
    const client = new HyperbolicClient({ apiKey: 'k' })

    await client.generateImage({ prompt: 'a logo', lora: 'Logo', loraWeight: 0.5 })

    const body = JSON.parse(calls[0].options.body)
    assert.deepEqual(body.lora, { name: 'Logo', weight: 0.5 })
  })

  it('requires prompt', async () => {
    const client = new HyperbolicClient({ apiKey: 'k' })
    await assert.rejects(() => client.generateImage({}), /prompt is required/)
  })
})

describe('HyperbolicClient: generateAudio', () => {
  it('returns base64 audio', async () => {
    mockFetch([{ body: AUDIO_RESPONSE }])
    const client = new HyperbolicClient({ apiKey: 'k' })

    const result = await client.generateAudio({ text: 'Hello world' })

    assert.ok(result.audioBase64)

    const body = JSON.parse(calls[0].options.body)
    assert.equal(body.text, 'Hello world')
    assert.equal(body.language, 'EN')
    assert.equal(body.speaker_id, 'EN-US')
  })

  it('requires text', async () => {
    const client = new HyperbolicClient({ apiKey: 'k' })
    await assert.rejects(() => client.generateAudio({}), /text is required/)
  })
})

describe('HyperbolicClient: analyzeImage', () => {
  it('sends image URL in vision format', async () => {
    mockFetch([{ body: CHAT_RESPONSE }])
    const client = new HyperbolicClient({ apiKey: 'k' })

    await client.analyzeImage({
      model: 'Qwen/Qwen2-VL-7B-Instruct',
      prompt: 'What is in this image?',
      imageUrl: 'https://example.com/cat.jpg',
    })

    const body = JSON.parse(calls[0].options.body)
    const content = body.messages[0].content
    assert.equal(content.length, 2)
    assert.equal(content[0].type, 'text')
    assert.equal(content[1].type, 'image_url')
    assert.equal(content[1].image_url.url, 'https://example.com/cat.jpg')
  })

  it('sends base64 image as data URI', async () => {
    mockFetch([{ body: CHAT_RESPONSE }])
    const client = new HyperbolicClient({ apiKey: 'k' })

    await client.analyzeImage({
      model: 'test',
      prompt: 'describe',
      imageBase64: 'abc123',
    })

    const body = JSON.parse(calls[0].options.body)
    assert.equal(body.messages[0].content[1].image_url.url, 'data:image/jpeg;base64,abc123')
  })

  it('requires image', async () => {
    const client = new HyperbolicClient({ apiKey: 'k' })
    await assert.rejects(
      () => client.analyzeImage({ model: 'test', prompt: 'describe' }),
      /image-url or image-base64 is required/,
    )
  })
})

describe('HyperbolicClient: GPU compute', () => {
  it('rentGpu sends correct request', async () => {
    mockFetch([
      {
        body: {
          instance_id: 'i-abc123',
          status: 'provisioning',
          ssh_command: 'ssh root@1.2.3.4',
        },
      },
    ])
    const client = new HyperbolicClient({ apiKey: 'k' })

    const result = await client.rentGpu({ gpuType: 'H100-SXM', gpuCount: 2 })

    assert.equal(result.instanceId, 'i-abc123')
    assert.equal(result.sshCommand, 'ssh root@1.2.3.4')
    assert.equal(result.status, 'provisioning')

    const body = JSON.parse(calls[0].options.body)
    assert.equal(body.gpu_type, 'H100-SXM')
    assert.equal(body.gpu_count, 2)
  })

  it('rentGpu requires gpu-type', async () => {
    const client = new HyperbolicClient({ apiKey: 'k' })
    await assert.rejects(() => client.rentGpu({}), /gpu-type is required/)
  })

  it('terminateGpu sends DELETE', async () => {
    mockFetch([{ body: { status: 'terminated' } }])
    const client = new HyperbolicClient({ apiKey: 'k' })

    const result = await client.terminateGpu('i-abc123')

    assert.equal(result.status, 'terminated')
    assert.match(calls[0].url, /\/v1\/marketplace\/instances\/i-abc123/)
    assert.equal(calls[0].options.method, 'DELETE')
  })
})

describe('HyperbolicClient: error handling', () => {
  it('throws W3ActionError on API error', async () => {
    mockFetch([{ status: 500, body: 'Internal Server Error' }])
    const client = new HyperbolicClient({ apiKey: 'k' })

    await assert.rejects(
      () => client.chat({ model: 'test', messages: [{ role: 'user', content: 'hi' }] }),
      (err) => err instanceof W3ActionError && err.code === 'HTTP_ERROR' && err.statusCode === 500,
    )
  })
})
