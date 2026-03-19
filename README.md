# W3 Hyperbolic Action

AI inference and on-demand GPU compute via [Hyperbolic](https://hyperbolic.xyz)
for GitHub Actions. Supports text generation, image generation, audio synthesis,
vision analysis, and GPU rental.

## About Hyperbolic

[Hyperbolic](https://hyperbolic.xyz) is an on-demand AI cloud
combining an inference API with a GPU rental marketplace. It offers
an OpenAI-compatible API with 13+ open-source models (DeepSeek,
Llama, Qwen) at 3-10x lower cost than inference competitors, and
H100 GPUs at $1.49/hr (vs $3-4/hr elsewhere).

The platform supports text, image, audio, and vision in a single
API. Over 200,000 engineers and researchers use Hyperbolic, with
endorsements from Andrej Karpathy and the Hugging Face CEO.

**Why use it:** Cost-effective AI in workflows. Structured data
extraction, image generation, document analysis, and GPU compute
for training jobs.

## Quick start

```yaml
- name: Ask a question
  id: ai
  uses: w3-io/w3-hyperbolic-action@v0
  with:
    command: chat
    api-key: ${{ secrets.HYPERBOLIC_API_KEY }}
    model: "deepseek-ai/DeepSeek-V3"
    messages: '[{"role":"user","content":"What is Ethereum?"}]'

- name: Use the response
  run: echo "${{ fromJSON(steps.ai.outputs.result).content }}"
```

## Commands

| Command | Description |
|---------|-------------|
| `chat` | Text generation with 13+ open-source models |
| `generate-image` | Image generation with Stable Diffusion, Flux.1, LoRA |
| `generate-audio` | Text-to-speech with multi-language support |
| `analyze-image` | Image understanding via vision-language models |
| `rent-gpu` | Rent on-demand GPU instances |
| `list-gpus` | List available GPU types and pricing |
| `terminate-gpu` | Terminate a rented GPU instance |

## Documentation

See [docs/guide.md](docs/guide.md) for the full reference including all
inputs, outputs, examples, and available models.

## Authentication

Get an API key from [Hyperbolic](https://app.hyperbolic.ai) and store it
as `HYPERBOLIC_API_KEY` in your repository secrets.
