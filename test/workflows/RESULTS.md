# E2E Test Results

Last verified: 2026-04-15

## Environment

- W3 local network (3-node localnet)
- Protocol: master (includes EIP-712, bridge-allow expansion, nonce manager)
- Runner image: w3io/w3-runner (Node 20/24)

## Prerequisites

- W3 local network running (make dev)
- W3_SECRET_HYPERBOLIC_API_KEY set to a Hyperbolic API key

## Results

| Step | Command | Status | Notes |
|------|---------|--------|-------|
| 1 | chat | PASS | meta-llama/Llama-3.3-70B-Instruct, max-tokens 50 |

## Known Limitations

- generate-image: commented out, SDXL1.0-base no longer publicly
  available on Hyperbolic.
- generate-audio: commented out, requires specific model access.
- analyze-image: commented out, requires specific model access.
- list-gpus: commented out, returns 405 Method Not Allowed (endpoint
  may have changed or require different authentication).
- rent-gpu / terminate-gpu: not tested, incurs real costs.
