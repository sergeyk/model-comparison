# AI Model Comparison

A single-page web app to compare AI models by pricing, capabilities, and benchmarks.

## Model Types

- **Text/LLM** — Language models with token pricing, context lengths, and benchmarks (GPQA, AIME 2025, SWE-bench)
- **Image Generation** — DALL-E, GPT Image, Imagen with per-image pricing
- **Video Generation** — Sora, Veo with per-second pricing
- **Text-to-Speech** — TTS models with voice counts and character pricing
- **Realtime Voice** — Live audio models with separate text/audio pricing

## Features

- Filter by provider, context length, input modalities (image/video/audio/PDF)
- Filter by capabilities (reasoning, open weights)
- Star models to compare side-by-side
- Sort by any column

## Quick Start

```bash
npm install
npm start        # builds data and serves at http://localhost:8888
```

Or separately:
```bash
npm run build    # generate data/models.json from models.dev submodule
npm run serve    # serve on port 8888
```

## Updating Model Data

To refresh the model data with the latest from upstream:

```bash
git submodule update --remote   # pull latest models.dev data
npm run update-models           # regenerate data/models.json
```

## Data Sources

- Model metadata: [models.dev](https://github.com/anomalyco/models.dev) (git submodule)
- Benchmarks: [llm-stats.com](https://llm-stats.com/leaderboards/llm-leaderboard)
- Specialized models: OpenAI and Google API docs

## Project Structure

```
index.html       # Main app (vanilla JS + DataTables)
build-data.js    # Generates models.json from models.dev
data/models.json # Generated model data
models.dev/      # Git submodule with model metadata
```
