import { jest } from '@jest/globals'
import { readFileSync } from 'fs'

const chatFixture = JSON.parse(readFileSync(new URL('../__fixtures__/chat-response.json', import.meta.url)))
const imageFixture = JSON.parse(readFileSync(new URL('../__fixtures__/image-response.json', import.meta.url)))
const audioFixture = JSON.parse(readFileSync(new URL('../__fixtures__/audio-response.json', import.meta.url)))

const mockFetch = jest.fn()
global.fetch = mockFetch

const mockCore = await import('../__fixtures__/core.js')
jest.unstable_mockModule('@actions/core', () => mockCore)

const { run } = await import('../src/main.js')

function mockOk(data) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(data),
  })
}

describe('run', () => {
  beforeEach(() => {
    mockCore.reset()
    mockFetch.mockReset()
  })

  test('chat command returns formatted result', async () => {
    mockCore.setInputs({
      command: 'chat',
      'api-key': 'test-key',
      model: 'deepseek-ai/DeepSeek-V3',
      messages: '[{"role":"user","content":"Hello"}]',
    })
    mockOk(chatFixture)

    await run()

    const result = JSON.parse(mockCore.getOutputs().result)
    expect(result.content).toBe('The capital of France is Paris.')
    expect(result.totalTokens).toBe(20)
    expect(mockCore.getErrors()).toHaveLength(0)
  })

  test('chat with structured output', async () => {
    mockCore.setInputs({
      command: 'chat',
      'api-key': 'test-key',
      model: 'test',
      messages: '[{"role":"user","content":"extract"}]',
      'response-format': '{"type":"json_schema","json_schema":{"name":"test","strict":true}}',
    })
    mockOk(chatFixture)

    await run()

    expect(mockCore.getErrors()).toHaveLength(0)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.response_format.type).toBe('json_schema')
  })

  test('generate-image returns image data', async () => {
    mockCore.setInputs({
      command: 'generate-image',
      'api-key': 'test-key',
      prompt: 'a cat wearing sunglasses',
    })
    mockOk(imageFixture)

    await run()

    const result = JSON.parse(mockCore.getOutputs().result)
    expect(result.imageBase64).toBeTruthy()
    expect(mockCore.getErrors()).toHaveLength(0)
  })

  test('generate-audio returns audio data', async () => {
    mockCore.setInputs({
      command: 'generate-audio',
      'api-key': 'test-key',
      text: 'Hello world',
    })
    mockOk(audioFixture)

    await run()

    const result = JSON.parse(mockCore.getOutputs().result)
    expect(result.audioBase64).toBeTruthy()
    expect(mockCore.getErrors()).toHaveLength(0)
  })

  test('analyze-image sends vision request', async () => {
    mockCore.setInputs({
      command: 'analyze-image',
      'api-key': 'test-key',
      model: 'Qwen/Qwen2-VL-7B-Instruct',
      prompt: 'What is this?',
      'image-url': 'https://example.com/photo.jpg',
    })
    mockOk(chatFixture)

    await run()

    expect(mockCore.getErrors()).toHaveLength(0)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.messages[0].content[1].image_url.url).toBe('https://example.com/photo.jpg')
  })

  test('rent-gpu returns instance info', async () => {
    mockCore.setInputs({
      command: 'rent-gpu',
      'api-key': 'test-key',
      'gpu-type': 'H100-SXM',
      'gpu-count': '2',
    })
    mockOk({ instance_id: 'i-abc', status: 'provisioning', ssh_command: 'ssh root@1.2.3.4' })

    await run()

    const result = JSON.parse(mockCore.getOutputs().result)
    expect(result.instanceId).toBe('i-abc')
    expect(mockCore.getErrors()).toHaveLength(0)
  })

  test('terminate-gpu sends delete', async () => {
    mockCore.setInputs({
      command: 'terminate-gpu',
      'api-key': 'test-key',
      'instance-id': 'i-abc',
    })
    mockOk({ status: 'terminated' })

    await run()

    const result = JSON.parse(mockCore.getOutputs().result)
    expect(result.status).toBe('terminated')
    expect(mockCore.getErrors()).toHaveLength(0)
  })

  test('unknown command fails', async () => {
    mockCore.setInputs({ command: 'bogus', 'api-key': 'test-key' })

    await run()

    expect(mockCore.getErrors()).toHaveLength(1)
    expect(mockCore.getErrors()[0]).toContain('Unknown command')
  })

  test('invalid JSON in messages fails', async () => {
    mockCore.setInputs({
      command: 'chat',
      'api-key': 'test-key',
      model: 'test',
      messages: 'not json',
    })

    await run()

    expect(mockCore.getErrors()).toHaveLength(1)
    expect(mockCore.getErrors()[0]).toContain('Invalid JSON')
  })
})
