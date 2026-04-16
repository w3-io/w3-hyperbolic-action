# TODO

## Model availability — Hyperbolic-side

Skipped because the model isn't available to us on the current
credential tier. Revisit if access opens up.

- [ ] `generate-image` — SDXL1.0-base not publicly available anymore.
      Try with a currently-listed image model.
- [ ] `generate-audio` — specific model access required.
- [ ] `analyze-image` — vision model access required.

## API endpoint drift

- [ ] `list-gpus` — currently returns 405. The endpoint was
      presumably `GET /api/v1/marketplace` or similar and has
      changed. Re-check Hyperbolic's docs and update the action.

## Costs real money

- [ ] `rent-gpu` / `terminate-gpu` — tested together would be a
      minutes-long rental. Even the cheapest tier costs real credits
      per hour, so skip in CI. If we want a verified E2E, do a
      manual run with a terminate-in-5s guard and document the cost
      in RESULTS.md.

## Docs

- [ ] Add a "Model catalog" section to `docs/guide.md` listing the
      models Hyperbolic currently supports for `chat` /
      `generate-image` / `generate-audio`. Today the action accepts
      any model string; users have to go to Hyperbolic's site to know
      what's valid.
