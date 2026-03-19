import { jest } from '@jest/globals'
import { readFileSync } from 'fs'
import { HyperbolicClient, HyperbolicError } from '../src/hyperbolic.js'

const chatFixture = JSON.parse(readFileSync(new URL('../__fixtures__/chat-response.json', import.meta.url)))
const imageFixture = JSON.parse(readFileSync(new URL('../__fixtures__/image-response.json', import.meta.url)))
const audioFixture = JSON.parse(readFileSync(new URL('../__fixtures__/audio-response.json', import.meta.url)))

const mockFetch = jest.fn()
global.fetch = mockFetch

function mockOk(data) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(data),
  })
}

function mockError(status, body) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => body,
  })
}

describe('HyperbolicClient', () => {
  const client = new HyperbolicClient({ apiKey: 'test-key' })

  beforeEach(() => {
    mockFetch.mockReset()
  })

  test('constructor requires api key', () => {
    expect(() => new HyperbolicClient({})).toThrow('API key is required')
  })

  describe('chat', () => {
    test('sends correct request and parses response', async () => {
      mockOk(chatFixture)

      const result = await client.chat({
        model: 'deepseek-ai/DeepSeek-V3',
        messages: [{ role: 'user', content: 'What is the capital of France?' }],
        temperature: 0.1,
      })

      expect(result.content).toBe('The capital of France is Paris.')
      expect(result.modelUsed).toBe('deepseek-ai/DeepSeek-V3')
      expect(result.finishReason).toBe('stop')
      expect(result.inputTokens).toBe(12)
      expect(result.outputTokens).toBe(8)
      expect(result.totalTokens).toBe(20)

      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.hyperbolic.xyz/v1/chat/completions')
      expect(opts.method).toBe('POST')
      expect(opts.headers.Authorization).toBe('Bearer test-key')

      const body = JSON.parse(opts.body)
      expect(body.model).toBe('deepseek-ai/DeepSeek-V3')
      expect(body.temperature).toBe(0.1)
      expect(body.messages).toHaveLength(1)
    })

    test('requires model', async () => {
      await expect(
        client.chat({ messages: [{ role: 'user', content: 'hi' }] }),
      ).rejects.toThrow('model is required')
    })

    test('requires messages', async () => {
      await expect(client.chat({ model: 'test' })).rejects.toThrow('messages is required')
    })

    test('passes response format for structured output', async () => {
      mockOk(chatFixture)

      await client.chat({
        model: 'test',
        messages: [{ role: 'user', content: 'hi' }],
        responseFormat: { type: 'json_schema', json_schema: { name: 'test', strict: true } },
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.response_format.type).toBe('json_schema')
    })

    test('passes tools for function calling', async () => {
      mockOk(chatFixture)

      const tools = [{ type: 'function', function: { name: 'get_weather', parameters: {} } }]
      await client.chat({
        model: 'test',
        messages: [{ role: 'user', content: 'weather?' }],
        tools,
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.tools).toEqual(tools)
    })

    test('omits undefined optional params', async () => {
      mockOk(chatFixture)

      await client.chat({
        model: 'test',
        messages: [{ role: 'user', content: 'hi' }],
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body).not.toHaveProperty('temperature')
      expect(body).not.toHaveProperty('top_p')
      expect(body).not.toHaveProperty('max_tokens')
      expect(body).not.toHaveProperty('seed')
    })
  })

  describe('generateImage', () => {
    test('returns base64 image', async () => {
      mockOk(imageFixture)

      const result = await client.generateImage({ prompt: 'a cat' })

      expect(result.imageBase64).toBeTruthy()
      expect(result.seed).toBe(42)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.prompt).toBe('a cat')
      expect(body.height).toBe(1024)
      expect(body.width).toBe(1024)
    })

    test('passes LoRA config', async () => {
      mockOk(imageFixture)

      await client.generateImage({ prompt: 'a logo', lora: 'Logo', loraWeight: 0.5 })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.lora).toEqual({ name: 'Logo', weight: 0.5 })
    })

    test('requires prompt', async () => {
      await expect(client.generateImage({})).rejects.toThrow('prompt is required')
    })
  })

  describe('generateAudio', () => {
    test('returns base64 audio', async () => {
      mockOk(audioFixture)

      const result = await client.generateAudio({ text: 'Hello world' })

      expect(result.audioBase64).toBeTruthy()

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.text).toBe('Hello world')
      expect(body.language).toBe('EN')
      expect(body.speaker_id).toBe('EN-US')
    })

    test('requires text', async () => {
      await expect(client.generateAudio({})).rejects.toThrow('text is required')
    })
  })

  describe('analyzeImage', () => {
    test('sends image URL in vision format', async () => {
      mockOk(chatFixture)

      await client.analyzeImage({
        model: 'Qwen/Qwen2-VL-7B-Instruct',
        prompt: 'What is in this image?',
        imageUrl: 'https://example.com/cat.jpg',
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const content = body.messages[0].content
      expect(content).toHaveLength(2)
      expect(content[0].type).toBe('text')
      expect(content[1].type).toBe('image_url')
      expect(content[1].image_url.url).toBe('https://example.com/cat.jpg')
    })

    test('sends base64 image as data URI', async () => {
      mockOk(chatFixture)

      await client.analyzeImage({
        model: 'test',
        prompt: 'describe',
        imageBase64: 'abc123',
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.messages[0].content[1].image_url.url).toBe('data:image/jpeg;base64,abc123')
    })

    test('requires image', async () => {
      await expect(
        client.analyzeImage({ model: 'test', prompt: 'describe' }),
      ).rejects.toThrow('image-url or image-base64 is required')
    })
  })

  describe('GPU compute', () => {
    test('rentGpu sends correct request', async () => {
      mockOk({ instance_id: 'i-abc123', status: 'provisioning', ssh_command: 'ssh root@1.2.3.4' })

      const result = await client.rentGpu({ gpuType: 'H100-SXM', gpuCount: 2 })

      expect(result.instanceId).toBe('i-abc123')
      expect(result.sshCommand).toBe('ssh root@1.2.3.4')
      expect(result.status).toBe('provisioning')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.gpu_type).toBe('H100-SXM')
      expect(body.gpu_count).toBe(2)
    })

    test('rentGpu requires gpu-type', async () => {
      await expect(client.rentGpu({})).rejects.toThrow('gpu-type is required')
    })

    test('terminateGpu sends DELETE', async () => {
      mockOk({ status: 'terminated' })

      const result = await client.terminateGpu('i-abc123')

      expect(result.status).toBe('terminated')

      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain('/v1/marketplace/instances/i-abc123')
      expect(opts.method).toBe('DELETE')
    })
  })

  describe('error handling', () => {
    test('throws on rate limit', async () => {
      mockError(429, 'Rate limit exceeded')

      try {
        await client.chat({ model: 'test', messages: [{ role: 'user', content: 'hi' }] })
      } catch (e) {
        expect(e).toBeInstanceOf(HyperbolicError)
        expect(e.code).toBe('RATE_LIMIT')
      }
    })

    test('throws on API error', async () => {
      mockError(500, 'Internal Server Error')

      try {
        await client.chat({ model: 'test', messages: [{ role: 'user', content: 'hi' }] })
      } catch (e) {
        expect(e).toBeInstanceOf(HyperbolicError)
        expect(e.code).toBe('API_ERROR')
        expect(e.status).toBe(500)
      }
    })
  })
})
