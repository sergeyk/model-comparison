const fs = require('fs');
const path = require('path');
const toml = require('toml');

const PROVIDERS_DIR = './models.dev/providers';
const OUTPUT_FILE = './data/models.json';

// Only include canonical/first-party providers (not resellers like AIHubMix, Venice AI, etc.)
const CANONICAL_PROVIDERS = new Set([
  'anthropic',
  'openai',
  'google',
  'xai',
  'deepseek',
  'meta',
  'mistral',
  'cohere',
  'alibaba',      // Qwen
  'zhipu',        // GLM
  'minimax',
  'moonshot',     // Kimi
  'baidu',        // Ernie
  '01-ai',        // Yi
  'nvidia',
]);

// Only include models from the last 12 months
const CUTOFF_DATE = new Date();
CUTOFF_DATE.setFullYear(CUTOFF_DATE.getFullYear() - 1);

// Normalize model names to their "line" for version comparison
// e.g., GPT-5.2, GPT-5.1, GPT-5 all belong to "gpt-flagship"
// but GPT-5 mini is a different line "gpt-mini"
function getModelLine(name, family) {
  const nameLower = name.toLowerCase();

  // OpenAI models - consolidate by tier across versions (GPT-5.2 > 5.1 > 5 > 4.1 etc)
  if (/gpt.*pro/i.test(name) && !/codex/i.test(name)) return 'openai-gpt-pro';
  if (/gpt.*mini/i.test(name) && !/codex/i.test(name)) return 'openai-gpt-mini';
  if (/gpt.*nano/i.test(name) && !/codex/i.test(name)) return 'openai-gpt-nano';
  if (/gpt.*codex.*mini/i.test(name)) return 'openai-codex-mini';
  if (/gpt.*codex.*max/i.test(name)) return 'openai-codex-max';
  if (/gpt.*codex/i.test(name)) return 'openai-codex';
  if (/gpt-?[45o]/i.test(name) && !/mini|nano|pro|codex/i.test(name)) return 'openai-gpt-flagship';
  if (/^o[0-9]-?pro/i.test(name)) return 'openai-o-pro';
  if (/^o[0-9]-?mini/i.test(name)) return 'openai-o-mini';
  if (/^o[0-9]$/i.test(name) || /^o[0-9][^a-z]/i.test(name)) return 'openai-o';

  // Anthropic models
  if (/claude.*opus/i.test(name)) return 'anthropic-opus';
  if (/claude.*sonnet/i.test(name)) return 'anthropic-sonnet';
  if (/claude.*haiku/i.test(name)) return 'anthropic-haiku';

  // Google models - keep both preview and stable
  if (/gemini.*3.*pro/i.test(name)) return 'google-gemini-3-pro';
  if (/gemini.*3.*flash/i.test(name)) return 'google-gemini-3-flash';
  if (/gemini.*2\.5.*pro/i.test(name)) return 'google-gemini-2.5-pro';
  if (/gemini.*2\.5.*flash.*lite/i.test(name)) return 'google-gemini-2.5-flash-lite';
  if (/gemini.*2\.5.*flash.*tts/i.test(name)) return 'google-gemini-2.5-flash-tts';
  if (/gemini.*2\.5.*flash.*image/i.test(name)) return 'google-gemini-2.5-flash-image';
  if (/gemini.*2\.5.*flash/i.test(name)) return 'google-gemini-2.5-flash';
  if (/gemini.*2\.0.*flash/i.test(name)) return 'google-gemini-2.0-flash';

  // xAI models - consolidate by tier across versions
  if (/grok.*fast/i.test(name)) return 'xai-grok-fast';
  if (/grok.*mini/i.test(name)) return 'xai-grok-mini';
  if (/grok.*code/i.test(name)) return 'xai-grok-code';
  if (/grok/i.test(name)) return 'xai-grok';

  // DeepSeek
  if (/deepseek.*r1/i.test(name)) return 'deepseek-r1';
  if (/deepseek.*v3/i.test(name)) return 'deepseek-v3';
  if (/deepseek.*v2/i.test(name)) return 'deepseek-v2';

  // Mistral
  if (/mistral.*large/i.test(name)) return 'mistral-large';
  if (/mistral.*medium/i.test(name)) return 'mistral-medium';
  if (/mistral.*small/i.test(name)) return 'mistral-small';
  if (/codestral/i.test(name)) return 'mistral-codestral';
  if (/pixtral.*large/i.test(name)) return 'mistral-pixtral-large';
  if (/pixtral/i.test(name)) return 'mistral-pixtral';

  // Qwen/Alibaba
  if (/qwen.*3.*235b/i.test(name)) return 'alibaba-qwen3-235b';
  if (/qwen.*3.*32b/i.test(name)) return 'alibaba-qwen3-32b';
  if (/qwen.*3.*14b/i.test(name)) return 'alibaba-qwen3-14b';
  if (/qwen.*3.*8b/i.test(name)) return 'alibaba-qwen3-8b';
  if (/qwen.*3.*4b/i.test(name)) return 'alibaba-qwen3-4b';
  if (/qwen.*coder/i.test(name)) return 'alibaba-qwen-coder';
  if (/qwen.*vl/i.test(name)) return 'alibaba-qwen-vl';
  if (/qwq/i.test(name)) return 'alibaba-qwq';

  // Fallback to family or normalized name
  return family || nameLower.replace(/[^a-z0-9]/g, '-');
}

function parseTomlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return toml.parse(content);
  } catch (e) {
    console.error(`Error parsing ${filePath}:`, e.message);
    return null;
  }
}

function getModels() {
  const providers = fs.readdirSync(PROVIDERS_DIR);
  const allModels = [];
  const modelFamilies = {}; // Track latest version per family

  for (const provider of providers) {
    // Skip non-canonical providers (resellers, aggregators, etc.)
    if (!CANONICAL_PROVIDERS.has(provider)) continue;

    const providerPath = path.join(PROVIDERS_DIR, provider);
    const providerToml = path.join(providerPath, 'provider.toml');
    const modelsDir = path.join(providerPath, 'models');

    if (!fs.existsSync(providerToml) || !fs.existsSync(modelsDir)) continue;

    const providerData = parseTomlFile(providerToml);
    if (!providerData) continue;

    const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.toml'));

    for (const modelFile of modelFiles) {
      // Skip "latest" alias files - we want specific versions
      if (modelFile.includes('-latest.toml')) continue;

      const modelPath = path.join(modelsDir, modelFile);
      const modelData = parseTomlFile(modelPath);
      if (!modelData) continue;

      // Parse release date
      const releaseDate = modelData.release_date ? new Date(modelData.release_date) : null;

      // Skip models older than 12 months
      if (releaseDate && releaseDate < CUTOFF_DATE) continue;

      const modelId = modelFile.replace('.toml', '');
      const family = modelData.family || modelId;

      const model = {
        id: modelId,
        name: (modelData.name || modelId).replace(/\s*\(latest\)\s*/i, ''),
        provider: providerData.name || provider,
        providerId: provider,
        family: family,
        releaseDate: modelData.release_date || null,
        lastUpdated: modelData.last_updated || null,

        // Capabilities
        reasoning: modelData.reasoning || false,
        toolCall: modelData.tool_call || false,
        structuredOutput: modelData.structured_output || false,
        openWeights: modelData.open_weights || false,

        // Pricing (per million tokens)
        inputPrice: modelData.cost?.input || null,
        outputPrice: modelData.cost?.output || null,
        cacheReadPrice: modelData.cost?.cache_read || null,
        cacheWritePrice: modelData.cost?.cache_write || null,

        // Knowledge cutoff
        knowledgeCutoff: modelData.knowledge || null,

        // Limits
        contextLength: modelData.limit?.context || null,
        outputLimit: modelData.limit?.output || null,

        // Modalities
        inputModalities: modelData.modalities?.input || ['text'],
        outputModalities: modelData.modalities?.output || ['text'],

        // Derived capabilities for filtering
        supportsImage: (modelData.modalities?.input || []).includes('image'),
        supportsVideo: (modelData.modalities?.input || []).includes('video'),
        supportsPdf: (modelData.modalities?.input || []).includes('pdf'),
        supportsAudio: (modelData.modalities?.input || []).includes('audio'),
      };

      // Track by model line to keep only latest version
      const modelLine = getModelLine(model.name, family);
      const existingInLine = modelFamilies[modelLine];
      if (!existingInLine) {
        modelFamilies[modelLine] = model;
      } else {
        // Compare release dates, keep the newer one
        const existingDate = existingInLine.releaseDate ? new Date(existingInLine.releaseDate) : new Date(0);
        const currentDate = releaseDate || new Date(0);
        if (currentDate > existingDate) {
          modelFamilies[modelLine] = model;
        }
      }
    }
  }

  return Object.values(modelFamilies);
}

// Benchmark data from llm-stats.com (manually extracted)
const benchmarkData = {
  "GPT-5.2 Pro": { gpqa: 93.2, aime2025: 100.0, swebench: null, hle: 36.6 },
  "GPT-5.2": { gpqa: 92.4, aime2025: 100.0, swebench: 80.0, hle: 34.5 },
  "Gemini 3 Pro": { gpqa: 91.9, aime2025: 100.0, swebench: 76.2, hle: null },
  "Gemini 3 Flash": { gpqa: 90.4, aime2025: 99.7, swebench: 78.0, hle: null },
  "Grok-4 Heavy": { gpqa: 88.4, aime2025: 100.0, swebench: null, hle: null },
  "GPT-5.1": { gpqa: 88.1, aime2025: 94.0, swebench: 76.3, hle: null },
  "Grok-4": { gpqa: 87.5, aime2025: 91.7, swebench: null, hle: null },
  "Claude Opus 4.5": { gpqa: 87.0, aime2025: null, swebench: 80.9, hle: null },
  "Gemini 2.5 Pro": { gpqa: 83.0, aime2025: 83.0, swebench: 63.2, hle: null },
  "GPT-5": { gpqa: 85.7, aime2025: 94.6, swebench: 74.9, hle: null },
  "Claude 3.7 Sonnet": { gpqa: 84.8, aime2025: 54.8, swebench: 70.3, hle: null },
  "Grok-3": { gpqa: 84.6, aime2025: 93.3, swebench: null, hle: null },
  "Claude Sonnet 4.5": { gpqa: 83.4, aime2025: 87.0, swebench: null, hle: null },
  "Gemini 2.5 Flash": { gpqa: 82.8, aime2025: 72.0, swebench: 60.4, hle: null },
  "DeepSeek-R1": { gpqa: 81.0, aime2025: 87.5, swebench: 44.6, hle: null },
  "GPT-5 mini": { gpqa: 82.3, aime2025: 91.1, swebench: null, hle: null },
  "o3": { gpqa: 83.3, aime2025: 86.4, swebench: 69.1, hle: null },
  "o4-mini": { gpqa: 81.4, aime2025: 92.7, swebench: 68.1, hle: null },
  "Claude Opus 4.1": { gpqa: 80.0, aime2025: null, swebench: 72.0, hle: null },
  "Claude Sonnet 4": { gpqa: 78.0, aime2025: null, swebench: 72.7, hle: null },
  "GPT-4o": { gpqa: 53.6, aime2025: null, swebench: null, hle: null },
  "GPT-4.1": { gpqa: 66.3, aime2025: null, swebench: null, hle: null },
  "Claude 3.5 Sonnet": { gpqa: 65.0, aime2025: null, swebench: 49.0, hle: null },
  "Claude 3.5 Haiku": { gpqa: 41.5, aime2025: null, swebench: null, hle: null },
  "Gemini 2.0 Flash": { gpqa: 62.0, aime2025: null, swebench: null, hle: null },
  "Claude Haiku 4.5": { gpqa: 60.0, aime2025: null, swebench: null, hle: null },
};

function matchBenchmark(modelName) {
  // Try exact match first
  if (benchmarkData[modelName]) {
    return benchmarkData[modelName];
  }

  // Try partial matches
  for (const [benchName, data] of Object.entries(benchmarkData)) {
    if (modelName.includes(benchName) || benchName.includes(modelName)) {
      return data;
    }
  }

  // Try normalized comparison
  const normalizedModel = modelName.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [benchName, data] of Object.entries(benchmarkData)) {
    const normalizedBench = benchName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedModel.includes(normalizedBench) || normalizedBench.includes(normalizedModel)) {
      return data;
    }
  }

  return null;
}

function main() {
  console.log('Building model data...');

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const models = getModels();

  // Add benchmark data
  for (const model of models) {
    const benchmark = matchBenchmark(model.name);
    if (benchmark) {
      model.gpqa = benchmark.gpqa;
      model.aime2025 = benchmark.aime2025;
      model.swebench = benchmark.swebench;
      model.hle = benchmark.hle;
    } else {
      model.gpqa = null;
      model.aime2025 = null;
      model.swebench = null;
      model.hle = null;
    }
  }

  // Sort by GPQA score (descending), then by release date
  models.sort((a, b) => {
    if (a.gpqa !== null && b.gpqa !== null) {
      return b.gpqa - a.gpqa;
    }
    if (a.gpqa !== null) return -1;
    if (b.gpqa !== null) return 1;

    const dateA = a.releaseDate ? new Date(a.releaseDate) : new Date(0);
    const dateB = b.releaseDate ? new Date(b.releaseDate) : new Date(0);
    return dateB - dateA;
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(models, null, 2));
  console.log(`Generated ${models.length} models to ${OUTPUT_FILE}`);
}

main();
