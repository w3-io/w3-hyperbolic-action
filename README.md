# W3 Hyperbolic Action

AI inference and GPU compute via Hyperbolic — text, image, audio, vision, and on-demand GPUs.

## Quick Start

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

| Command          | Description                                          |
| ---------------- | ---------------------------------------------------- |
| `chat`           | Text generation with 13+ open-source models          |
| `generate-image` | Image generation with Stable Diffusion, Flux.1, LoRA |
| `generate-audio` | Text-to-speech with multi-language support           |
| `analyze-image`  | Image understanding via vision-language models       |
| `rent-gpu`       | Rent on-demand GPU instances                         |
| `list-gpus`      | List available GPU types and pricing                 |
| `terminate-gpu`  | Terminate a rented GPU instance                      |

## Inputs

| Input             | Required | Default                      | Description                                         |
| ----------------- | -------- | ---------------------------- | --------------------------------------------------- |
| `command`         | Yes      | —                            | Operation to perform (see Commands)                 |
| `api-key`         | Yes      | —                            | Hyperbolic API key                                  |
| `api-url`         | No       | `https://api.hyperbolic.xyz` | API base URL override                               |
| `model`           | No       | —                            | Model ID (e.g. `deepseek-ai/DeepSeek-V3`)           |
| `messages`        | No       | —                            | Chat messages as JSON array                         |
| `temperature`     | No       | —                            | Sampling temperature (0.0-2.0)                      |
| `top-p`           | No       | —                            | Nucleus sampling threshold (0.0-1.0)                |
| `max-tokens`      | No       | —                            | Maximum tokens to generate                          |
| `response-format` | No       | —                            | Response format as JSON                             |
| `seed`            | No       | —                            | Random seed for reproducibility                     |
| `stop`            | No       | —                            | Comma-separated stop sequences                      |
| `tools`           | No       | —                            | Tool definitions as JSON array for function calling |
| `prompt`          | No       | —                            | Text prompt for image generation or vision question |
| `height`          | No       | `1024`                       | Image height in pixels                              |
| `width`           | No       | `1024`                       | Image width in pixels                               |
| `steps`           | No       | `25`                         | Number of diffusion steps                           |
| `lora`            | No       | —                            | LoRA style adapter name (e.g. `Pixel_Art`, `Logo`)  |
| `lora-weight`     | No       | `0.8`                        | LoRA influence weight (0.0-1.0)                     |
| `text`            | No       | —                            | Text to convert to speech                           |
| `language`        | No       | `EN`                         | TTS language: `EN`, `ES`, `FR`, `ZH`, `JP`, `KR`    |
| `speaker`         | No       | —                            | TTS speaker/accent (e.g. `EN-US`, `EN-BR`)          |
| `speed`           | No       | `1.0`                        | TTS speed multiplier (0.1-5.0)                      |
| `image-url`       | No       | —                            | URL of image to analyze                             |
| `image-base64`    | No       | —                            | Base64-encoded image to analyze                     |
| `gpu-type`        | No       | —                            | GPU type for rental (e.g. `H100-SXM`, `A100-SXM`)   |
| `gpu-count`       | No       | `1`                          | Number of GPUs (1, 2, 4, or 8)                      |
| `instance-id`     | No       | —                            | Instance ID for terminate-gpu                       |

## Outputs

| Output   | Description                  |
| -------- | ---------------------------- |
| `result` | JSON result of the operation |

## Authentication

Get an API key from [Hyperbolic](https://app.hyperbolic.ai) and store it as `HYPERBOLIC_API_KEY` in your repository secrets.
