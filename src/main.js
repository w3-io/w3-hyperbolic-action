import * as core from '@actions/core'
import { HyperbolicClient, HyperbolicError } from './hyperbolic.js'

const COMMANDS = {
  chat: runChat,
  'generate-image': runGenerateImage,
  'generate-audio': runGenerateAudio,
  'analyze-image': runAnalyzeImage,
  'list-gpus': runListGpus,
  'rent-gpu': runRentGpu,
  'terminate-gpu': runTerminateGpu,
}

export async function run() {
  try {
    const command = core.getInput('command', { required: true })
    const handler = COMMANDS[command]

    if (!handler) {
      core.setFailed(`Unknown command: "${command}". Available: ${Object.keys(COMMANDS).join(', ')}`)
      return
    }

    const client = new HyperbolicClient({
      apiKey: core.getInput('api-key', { required: true }),
      baseUrl: core.getInput('api-url') || undefined,
    })

    const result = await handler(client)
    core.setOutput('result', JSON.stringify(result))

    writeSummary(command, result)
  } catch (error) {
    if (error instanceof HyperbolicError) {
      core.setFailed(`Hyperbolic error (${error.code}): ${error.message}`)
    } else {
      core.setFailed(error.message)
    }
  }
}

// -- Command handlers -------------------------------------------------------

function parseJson(input, name) {
  if (!input) return undefined
  try {
    return JSON.parse(input)
  } catch {
    throw new HyperbolicError(`Invalid JSON for ${name}`, { code: 'INVALID_JSON' })
  }
}

async function runChat(client) {
  const messages = parseJson(core.getInput('messages', { required: true }), 'messages')
  const stop = core.getInput('stop')

  return client.chat({
    model: core.getInput('model', { required: true }),
    messages,
    temperature: core.getInput('temperature') ? Number(core.getInput('temperature')) : undefined,
    topP: core.getInput('top-p') ? Number(core.getInput('top-p')) : undefined,
    maxTokens: core.getInput('max-tokens') ? Number(core.getInput('max-tokens')) : undefined,
    responseFormat: parseJson(core.getInput('response-format'), 'response-format'),
    seed: core.getInput('seed') ? Number(core.getInput('seed')) : undefined,
    stop: stop ? stop.split(',').map((s) => s.trim()) : undefined,
    tools: parseJson(core.getInput('tools'), 'tools'),
  })
}

async function runGenerateImage(client) {
  return client.generateImage({
    model: core.getInput('model') || undefined,
    prompt: core.getInput('prompt', { required: true }),
    height: core.getInput('height') ? Number(core.getInput('height')) : undefined,
    width: core.getInput('width') ? Number(core.getInput('width')) : undefined,
    steps: core.getInput('steps') ? Number(core.getInput('steps')) : undefined,
    lora: core.getInput('lora') || undefined,
    loraWeight: core.getInput('lora-weight') ? Number(core.getInput('lora-weight')) : undefined,
  })
}

async function runGenerateAudio(client) {
  return client.generateAudio({
    text: core.getInput('text', { required: true }),
    language: core.getInput('language') || undefined,
    speaker: core.getInput('speaker') || undefined,
    speed: core.getInput('speed') ? Number(core.getInput('speed')) : undefined,
  })
}

async function runAnalyzeImage(client) {
  return client.analyzeImage({
    model: core.getInput('model', { required: true }),
    prompt: core.getInput('prompt', { required: true }),
    imageUrl: core.getInput('image-url') || undefined,
    imageBase64: core.getInput('image-base64') || undefined,
  })
}

async function runListGpus(client) {
  return client.listGpus()
}

async function runRentGpu(client) {
  return client.rentGpu({
    gpuType: core.getInput('gpu-type', { required: true }),
    gpuCount: core.getInput('gpu-count') ? Number(core.getInput('gpu-count')) : undefined,
  })
}

async function runTerminateGpu(client) {
  return client.terminateGpu(core.getInput('instance-id', { required: true }))
}

// -- Job summary ------------------------------------------------------------

function writeSummary(command, result) {
  const heading = `Hyperbolic: ${command}`

  if (command === 'chat') {
    const preview = result.content?.slice(0, 200) || ''
    core.summary
      .addHeading(heading, 3)
      .addRaw(`**Model:** \`${result.modelUsed}\`\n\n`)
      .addRaw(
        `**Tokens:** ${result.inputTokens} in / ${result.outputTokens} out (${result.totalTokens} total)\n\n`,
      )
      .addRaw(`**Response:** ${preview}${result.content?.length > 200 ? '...' : ''}\n`)
      .write()
    return
  }

  if (command === 'generate-image') {
    core.summary
      .addHeading(heading, 3)
      .addRaw(`**Model:** \`${result.model}\`\n\n`)
      .addRaw(`Image generated (${result.imageBase64 ? 'base64 in result' : 'no data'})\n`)
      .write()
    return
  }

  if (command === 'generate-audio') {
    core.summary
      .addHeading(heading, 3)
      .addRaw(`Audio generated (${result.audioBase64 ? 'base64 in result' : 'no data'})\n`)
      .write()
    return
  }

  if (command === 'rent-gpu') {
    core.summary
      .addHeading(heading, 3)
      .addRaw(`**Instance:** \`${result.instanceId}\`\n\n`)
      .addRaw(`**Status:** ${result.status}\n`)
      .write()
    return
  }

  // Default summary
  core.summary
    .addHeading(heading, 3)
    .addCodeBlock(JSON.stringify(result, null, 2), 'json')
    .write()
}
