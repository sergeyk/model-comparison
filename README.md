# Model Comparison

I want a simple one-page web app where I can find the best LLM model for my needs.

## v0

Make a simple JS web app that has a table of LLM models with their price and benchmark performance.

Only include models from the last 12 months, and only include the latest version of each model (e.g. opus 4.5 only, not 4.1 or 4.0 or 3.0; gpt-5.2 only, not 5.1 or 5.0; but both gemini-3-flash and gemini-2.5-flash, because 3 is still in preview).

To source the data, straight up clone https://github.com/anomalyco/models.dev as a submodule.

You need to join that to benchmark performance, which you can obtain from here https://llm-stats.com/leaderboards/llm-leaderboard

There should be a search bar to search by name or provider.

There should be a filter for capability like "context length > N (slider)", "image input", "video input", "pdf input".

Use either https://datatables.net or https://tanstack.com/table/latest, whichever is simplest but supports the features we need (seach, filtering column by set of values, filtering column by range, sorting each column)

## v1

There should be a way to compare models. Maybe a star at the start of each row, and the starred models show up in a special table at the top for easy comparison.

## v1

Let's do the same for image generation, video generation, TTS, and realtime voice models, too.

## v3

There should be an AI assistant (using the user's own API key which they can paste in to a textbox) that can recommend models based on user needs, e.g. "as capable as gemini-3 but cheaper"

## Maybe later

- Browse modelscope.cn, click into each model, and gather benchmarks

- There should be some pre-built "use cases" like "summarization", "long context retrieval", "chinese language", etc
