# E2E Test Results

> Last verified: 2026-04-15

## Prerequisites

| Credential         | Env var              | Source               |
| ------------------ | -------------------- | -------------------- |
| Hyperbolic API key | `HYPERBOLIC_API_KEY` | Hyperbolic dashboard |

## Results

| #   | Step            | Command | Status | Notes                         |
| --- | --------------- | ------- | ------ | ----------------------------- |
| 1   | Chat completion | `chat`  | PASS   | model: Llama-3.3-70B-Instruct |

## Skipped Commands

| Command                      | Reason                                    |
| ---------------------------- | ----------------------------------------- |
| `generate-image`             | SDXL1.0-base no longer publicly available |
| `generate-audio`             | Requires specific model access            |
| `analyze-image`              | Requires specific model access            |
| `list-gpus`                  | Returns 405; endpoint may have changed    |
| `rent-gpu` / `terminate-gpu` | Incurs real costs                         |

## How to run

```bash
# Export credentials
export HYPERBOLIC_API_KEY="..."

# Run
w3 workflow test --execute test/workflows/e2e.yaml
```
