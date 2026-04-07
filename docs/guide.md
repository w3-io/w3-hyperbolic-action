---
title: Hyperbolic AI Inference
category: integrations
actions: [chat, generate-image, generate-audio, analyze-image, rent-gpu, list-gpus, terminate-gpu]
complexity: intermediate
---

# Hyperbolic AI Inference

[Hyperbolic](https://hyperbolic.ai) is an on-demand AI cloud serving 13+ open-source models at 3-10x lower cost than competitors. OpenAI-compatible API — existing code migrates by changing the base URL. Supports text generation (DeepSeek, Llama, Qwen), image generation (Flux, SDXL), audio synthesis (TTS), vision analysis, and GPU rental (H100 at $1.49/hr). Used by 200,000+ engineers. Use this action for structured data extraction, content generation, document analysis, image processing, or provisioning GPU compute for training jobs.

AI inference (text, image, audio, vision) and on-demand GPU compute
via Hyperbolic. OpenAI-compatible chat API — existing OpenAI workflows
migrate by changing the base URL and API key.

## Quick start

```yaml
- name: Ask a question
  id: ai
  uses: w3-io/w3-hyperbolic-action@v0
  with:
    command: chat
    api-key: ${{ secrets.HYPERBOLIC_API_KEY }}
    model: 'deepseek-ai/DeepSeek-V3'
    messages: '[{"role":"user","content":"What is Ethereum?"}]'
```

## Commands

### chat

Text generation with 13+ open-source models. Supports structured JSON
output for workflow automation and function calling for tool use.

| Input             | Required | Description                           |
| ----------------- | -------- | ------------------------------------- |
| `model`           | yes      | Model ID (see available models below) |
| `messages`        | yes      | Chat messages as JSON array           |
| `temperature`     | no       | Sampling temperature (0.0-2.0)        |
| `top-p`           | no       | Nucleus sampling (0.0-1.0)            |
| `max-tokens`      | no       | Maximum tokens to generate            |
| `response-format` | no       | JSON schema for structured output     |
| `seed`            | no       | Random seed for reproducibility       |
| `stop`            | no       | Comma-separated stop sequences        |
| `tools`           | no       | Tool definitions as JSON array        |

**Output:**

```json
{
  "content": "Ethereum is a decentralized...",
  "modelUsed": "deepseek-ai/DeepSeek-V3",
  "finishReason": "stop",
  "inputTokens": 12,
  "outputTokens": 85,
  "totalTokens": 97,
  "toolCalls": null
}
```

### generate-image

Image generation with Stable Diffusion, Flux.1, and LoRA style adapters.

| Input         | Required | Description                                        |
| ------------- | -------- | -------------------------------------------------- |
| `prompt`      | yes      | Image description                                  |
| `model`       | no       | Model name (default: `SDXL1.0-base`)               |
| `height`      | no       | Height in pixels (default: 1024)                   |
| `width`       | no       | Width in pixels (default: 1024)                    |
| `steps`       | no       | Diffusion steps (default: 25)                      |
| `lora`        | no       | LoRA adapter (`Pixel_Art`, `Logo`, `Sci-fi`, etc.) |
| `lora-weight` | no       | LoRA influence (0.0-1.0, default: 0.8)             |

**Output:** `{imageBase64, model, seed}`

### generate-audio

Text-to-speech with multi-language support and accent variants.

| Input      | Required | Description                                                |
| ---------- | -------- | ---------------------------------------------------------- |
| `text`     | yes      | Text to speak                                              |
| `language` | no       | `EN`, `ES`, `FR`, `ZH`, `JP`, `KR` (default: `EN`)         |
| `speaker`  | no       | Accent: `EN-US`, `EN-BR`, `EN-AU`, etc. (default: `EN-US`) |
| `speed`    | no       | Speed multiplier 0.1-5.0 (default: 1.0)                    |

**Output:** `{audioBase64}`

### analyze-image

Image understanding via vision-language models.

| Input          | Required | Description              |
| -------------- | -------- | ------------------------ |
| `model`        | yes      | VLM model ID             |
| `prompt`       | yes      | Question about the image |
| `image-url`    | no\*     | URL of image             |
| `image-base64` | no\*     | Base64-encoded image     |

\*One of `image-url` or `image-base64` is required.

**Output:** `{content, modelUsed, inputTokens, outputTokens}`

### rent-gpu

Rent on-demand GPU instances.

| Input       | Required | Description                                    |
| ----------- | -------- | ---------------------------------------------- |
| `gpu-type`  | yes      | `H100-SXM`, `A100-SXM`, `RTX-4090`, `RTX-3090` |
| `gpu-count` | no       | 1, 2, 4, or 8 (default: 1)                     |

**Output:** `{instanceId, sshCommand, status}`

### list-gpus

List available GPU types and pricing. No inputs required.

### terminate-gpu

| Input         | Required | Description              |
| ------------- | -------- | ------------------------ |
| `instance-id` | yes      | Instance ID to terminate |

**Output:** `{status}`

## Available models

**Text:** DeepSeek-V3, DeepSeek-R1, Llama-3.3-70B, Llama-3.1-405B,
Qwen2.5-72B, QwQ-32B, Qwen2.5-Coder-32B, Llama-3.1-8B, and more.

**Image:** FLUX.1-dev, SDXL-1.0, SD-1.5, SD-2, SDXL-Turbo, Segmind-SD-1B,
plus ControlNet variants.

**Vision:** Qwen2.5-VL-72B-Instruct, Qwen2.5-VL-7B-Instruct, Pixtral-12B.

**Audio:** Melo TTS.

**GPU:** H100 SXM ($3.20/hr), A100 SXM ($1.80/hr), RTX 4090 ($0.50/hr),
RTX 3090 ($0.30/hr).

## Examples

### Structured JSON output

```yaml
- name: Extract entities
  id: extract
  uses: w3-io/w3-hyperbolic-action@v0
  with:
    command: chat
    api-key: ${{ secrets.HYPERBOLIC_API_KEY }}
    model: 'deepseek-ai/DeepSeek-V3'
    messages: '[{"role":"user","content":"Extract names from: Alice met Bob."}]'
    response-format: '{"type":"json_schema","json_schema":{"name":"entities","strict":true,"schema":{"type":"object","properties":{"names":{"type":"array","items":{"type":"string"}}},"required":["names"]}}}'
```

### Generate and analyze an image

```yaml
- name: Generate image
  id: img
  uses: w3-io/w3-hyperbolic-action@v0
  with:
    command: generate-image
    api-key: ${{ secrets.HYPERBOLIC_API_KEY }}
    prompt: 'A futuristic city at sunset'
    model: 'FLUX.1-dev'

- name: Describe the image
  uses: w3-io/w3-hyperbolic-action@v0
  with:
    command: analyze-image
    api-key: ${{ secrets.HYPERBOLIC_API_KEY }}
    model: 'Qwen/Qwen2.5-VL-72B-Instruct'
    prompt: 'Describe what you see in detail'
    image-base64: ${{ fromJSON(steps.img.outputs.result).imageBase64 }}
```

### Rent a GPU for training

```yaml
- name: Provision GPU
  id: gpu
  uses: w3-io/w3-hyperbolic-action@v0
  with:
    command: rent-gpu
    api-key: ${{ secrets.HYPERBOLIC_API_KEY }}
    gpu-type: 'H100-SXM'
    gpu-count: '4'

- name: Show SSH command
  run: echo "${{ fromJSON(steps.gpu.outputs.result).sshCommand }}"
```

## Beyond this W3 integration

This action covers inference (text, image, audio, vision) and basic
GPU rental. Hyperbolic's full platform extends further:

| Capability          | Via this action                                     | Via Hyperbolic platform                                       |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| Text generation     | `chat` command                                      | Same API                                                      |
| Image/audio/vision  | `generate-image`, `generate-audio`, `analyze-image` | Same API                                                      |
| On-demand GPUs      | `rent-gpu` (provision + SSH)                        | Full lifecycle management, VS Code extension                  |
| Reserved clusters   | Not yet                                             | Dedicated multi-node with InfiniBand, guaranteed availability |
| Model fine-tuning   | Not yet (use `rent-gpu` + SSH)                      | Coming: managed fine-tuning API                               |
| LoRA training       | Partial (inference with LoRA adapters)              | Full training pipeline                                        |
| Dedicated endpoints | Not yet                                             | Single-tenant private inference                               |

A workflow might use the `chat` command for quick inference, then
`rent-gpu` to provision hardware for a longer training job — all
through the same API key and platform.

For the full platform, see [Hyperbolic docs](https://docs.hyperbolic.ai).

## Authentication

Get an API key from [Hyperbolic](https://app.hyperbolic.ai). Store it
as `HYPERBOLIC_API_KEY` in your environment secrets.
