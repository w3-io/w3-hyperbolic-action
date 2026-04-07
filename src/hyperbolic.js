/**
 * Hyperbolic API client.
 *
 * Covers inference (text, image, audio, vision) and GPU compute.
 * OpenAI-compatible chat API — existing OpenAI workflows migrate
 * by changing the base URL and API key.
 *
 * Designed for reuse — import this module directly if building
 * a custom action or integration.
 */

import { request as coreRequest, W3ActionError } from '@w3-io/action-core'

const DEFAULT_BASE_URL = 'https://api.hyperbolic.xyz'

export class HyperbolicClient {
  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL } = {}) {
    if (!apiKey) throw new W3ActionError('MISSING_API_KEY', 'API key is required')
    this.apiKey = apiKey
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  // ---------------------------------------------------------------------------
  // Text generation (OpenAI-compatible chat completions)
  // ---------------------------------------------------------------------------

  /**
   * Generate text via chat completions.
   *
   * @param {object} options
   * @param {string} options.model - Model ID
   * @param {Array} options.messages - Chat messages [{role, content}]
   * @param {number} [options.temperature]
   * @param {number} [options.topP]
   * @param {number} [options.maxTokens]
   * @param {object} [options.responseFormat] - JSON schema mode
   * @param {number} [options.seed]
   * @param {string[]} [options.stop]
   * @param {Array} [options.tools] - Function calling tool definitions
   * @returns {object} {content, modelUsed, inputTokens, outputTokens, finishReason, toolCalls}
   */
  async chat({ model, messages, temperature, topP, maxTokens, responseFormat, seed, stop, tools }) {
    if (!model) throw new W3ActionError('MISSING_MODEL', 'model is required')
    if (!messages?.length) throw new W3ActionError('MISSING_MESSAGES', 'messages is required')

    const body = {
      model,
      messages,
      ...(temperature != null && { temperature }),
      ...(topP != null && { top_p: topP }),
      ...(maxTokens != null && { max_tokens: maxTokens }),
      ...(responseFormat && { response_format: responseFormat }),
      ...(seed != null && { seed }),
      ...(stop && { stop }),
      ...(tools && { tools }),
    }

    const data = await this.post('/v1/chat/completions', body)
    const choice = data.choices?.[0]

    return {
      content: choice?.message?.content || '',
      modelUsed: data.model || model,
      finishReason: choice?.finish_reason || null,
      toolCalls: choice?.message?.tool_calls || null,
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    }
  }

  // ---------------------------------------------------------------------------
  // Image generation
  // ---------------------------------------------------------------------------

  /**
   * Generate an image from a text prompt.
   *
   * @param {object} options
   * @param {string} options.model - Model name (e.g. "FLUX.1-dev", "SDXL1.0-base")
   * @param {string} options.prompt - Image description
   * @param {number} [options.height=1024]
   * @param {number} [options.width=1024]
   * @param {number} [options.steps=25] - Diffusion steps
   * @param {string} [options.lora] - LoRA adapter name
   * @param {number} [options.loraWeight=0.8] - LoRA influence
   * @returns {object} {imageBase64, model}
   */
  async generateImage({
    model = 'SDXL1.0-base',
    prompt,
    height = 1024,
    width = 1024,
    steps = 25,
    lora,
    loraWeight = 0.8,
  }) {
    if (!prompt) throw new W3ActionError('MISSING_PROMPT', 'prompt is required')

    const body = {
      model_name: model,
      prompt,
      height,
      width,
      steps,
      backend: 'auto',
      ...(lora && {
        lora: { name: lora, weight: loraWeight },
      }),
    }

    const data = await this.post('/v1/image/generation', body)
    const image = data.images?.[0] || {}

    return {
      imageBase64: image.image || null,
      model,
      seed: image.seed || null,
    }
  }

  // ---------------------------------------------------------------------------
  // Audio generation (TTS)
  // ---------------------------------------------------------------------------

  /**
   * Convert text to speech.
   *
   * @param {object} options
   * @param {string} options.text - Text to speak
   * @param {string} [options.language="EN"]
   * @param {string} [options.speaker="EN-US"]
   * @param {number} [options.speed=1.0]
   * @returns {object} {audioBase64}
   */
  async generateAudio({ text, language = 'EN', speaker = 'EN-US', speed = 1.0 }) {
    if (!text) throw new W3ActionError('MISSING_TEXT', 'text is required')

    const body = { text, language, speaker_id: speaker, speed }
    const data = await this.post('/v1/audio/generation', body)

    return {
      audioBase64: data.audio || null,
    }
  }

  // ---------------------------------------------------------------------------
  // Vision-language (image analysis)
  // ---------------------------------------------------------------------------

  /**
   * Analyze an image with a vision-language model.
   *
   * @param {object} options
   * @param {string} options.model - VLM model ID
   * @param {string} options.prompt - Question about the image
   * @param {string} [options.imageUrl] - URL of image
   * @param {string} [options.imageBase64] - Base64-encoded image
   * @returns {object} {content, modelUsed, inputTokens, outputTokens}
   */
  async analyzeImage({ model, prompt, imageUrl, imageBase64 }) {
    if (!model) throw new W3ActionError('MISSING_MODEL', 'model is required')
    if (!prompt) throw new W3ActionError('MISSING_PROMPT', 'prompt is required')
    if (!imageUrl && !imageBase64)
      throw new W3ActionError('MISSING_IMAGE', 'image-url or image-base64 is required')

    const imageContent = imageUrl
      ? { type: 'image_url', image_url: { url: imageUrl } }
      : { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }

    const messages = [
      {
        role: 'user',
        content: [{ type: 'text', text: prompt }, imageContent],
      },
    ]

    return this.chat({ model, messages })
  }

  // ---------------------------------------------------------------------------
  // GPU compute
  // ---------------------------------------------------------------------------

  /**
   * List available GPU types and pricing.
   *
   * @returns {Array} Available GPU configurations
   */
  async listGpus() {
    return this.get('/v1/marketplace')
  }

  /**
   * Rent a GPU instance.
   *
   * @param {object} options
   * @param {string} options.gpuType - GPU type (e.g. "H100-SXM")
   * @param {number} [options.gpuCount=1] - Number of GPUs
   * @returns {object} {instanceId, sshCommand, status}
   */
  async rentGpu({ gpuType, gpuCount = 1 }) {
    if (!gpuType) throw new W3ActionError('MISSING_GPU_TYPE', 'gpu-type is required')

    const data = await this.post('/v1/marketplace/instances', {
      gpu_type: gpuType,
      gpu_count: gpuCount,
    })

    return {
      instanceId: data.instance_id || data.id || null,
      sshCommand: data.ssh_command || null,
      status: data.status || 'provisioning',
    }
  }

  /**
   * Terminate a GPU instance.
   *
   * @param {string} instanceId
   * @returns {object} {status}
   */
  async terminateGpu(instanceId) {
    if (!instanceId) throw new W3ActionError('MISSING_INSTANCE_ID', 'instance-id is required')

    const data = await this.request('DELETE', `/v1/marketplace/instances/${instanceId}`)
    return { status: data.status || 'terminated' }
  }

  // ---------------------------------------------------------------------------
  // HTTP helpers
  // ---------------------------------------------------------------------------

  async post(path, body) {
    return this.request('POST', path, body)
  }

  async get(path) {
    return this.request('GET', path)
  }

  async request(method, path, body) {
    const url = `${this.baseUrl}${path}`
    const { status, body: parsed } = await coreRequest(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body,
    })

    // 204 No Content (typical for DELETE)
    if (status === 204) return {}

    return parsed
  }
}
