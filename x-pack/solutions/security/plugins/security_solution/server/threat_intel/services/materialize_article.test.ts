/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaterializeArticleInput } from '../../../common/threat_intel/workflows/step_types/materialize_article/materialize_article_common';
import { materializeArticle } from './materialize_article';

const NOW = new Date('2026-09-21T18:00:00.000Z');
const INPUT: MaterializeArticleInput = {
  source_type: 'rss',
  article_url: 'https://research.example/report',
  title: 'Threat report',
  rss_body_text: 'RSS summary '.repeat(100),
  existing_rendered_body_text: '',
  existing_status: '',
};

const lookupFn = jest.fn().mockResolvedValue([{ address: '93.184.216.34' }]);
const pace = jest.fn().mockResolvedValue(undefined);

const run = (
  overrides: Partial<MaterializeArticleInput> = {},
  fetchFn: typeof fetch = jest.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        data: { markdown: `# Threat report\n\n${'Full technical analysis. '.repeat(100)}` },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  )
) =>
  materializeArticle({ ...INPUT, ...overrides }, new AbortController().signal, {
    fetchFn,
    lookupFn,
    pace,
    now: () => NOW,
  });

describe('materializeArticle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses a valid Jina render as the effective body', async () => {
    const result = await run();

    expect(result.materialization).toEqual(
      expect.objectContaining({
        provider: 'jina',
        status: 'rendered',
        attempted_at: NOW.toISOString(),
        source_url: INPUT.article_url,
      })
    );
    expect(result.body_text).toBe(result.rendered_body_text);
    expect(result.body_text).toContain('Full technical analysis');
    expect(pace).toHaveBeenCalledTimes(1);
  });

  it('skips non-RSS reports without calling Jina', async () => {
    const fetchFn = jest.fn();
    const result = await run({ source_type: 'kev' }, fetchFn as typeof fetch);

    expect(result.body_text).toBe(INPUT.rss_body_text);
    expect(result.materialization.status).toBe('skipped');
    expect(result.materialization.reason).toBe('source_is_not_rss');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('skips RSS entries without an article URL', async () => {
    const fetchFn = jest.fn();
    const result = await run({ article_url: '' }, fetchFn as typeof fetch);

    expect(result.materialization.status).toBe('skipped');
    expect(result.materialization.reason).toBe('article_url_missing');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('reuses an existing successful render without calling Jina again', async () => {
    const fetchFn = jest.fn();
    const result = await run(
      {
        existing_status: 'rendered',
        existing_rendered_body_text: 'Cached technical report body',
      },
      fetchFn as typeof fetch
    );

    expect(result.body_text).toBe('Cached technical report body');
    expect(result.materialization.reason).toBe('cached_render');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('falls back to RSS when Jina returns an access challenge', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { markdown: 'Checking your browser. Enable JavaScript.'.repeat(10) },
        }),
        { status: 200 }
      )
    ) as typeof fetch;
    const result = await run({}, fetchFn);

    expect(result.body_text).toBe(INPUT.rss_body_text);
    expect(result.materialization.status).toBe('fallback');
    expect(result.materialization.reason).toBe('render_is_access_challenge');
  });

  it('falls back to RSS when the render is suspiciously short', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { markdown: 'Not enough article content.' } }), {
        status: 200,
      })
    ) as typeof fetch;
    const result = await run({}, fetchFn);

    expect(result.body_text).toBe(INPUT.rss_body_text);
    expect(result.materialization.status).toBe('fallback');
    expect(result.materialization.reason).toMatch(/^render_too_short:/);
  });

  it('falls back to RSS on an HTTP failure', async () => {
    const fetchFn = jest.fn().mockResolvedValue(new Response('unavailable', { status: 503 }));
    const result = await run({}, fetchFn as typeof fetch);

    expect(result.body_text).toBe(INPUT.rss_body_text);
    expect(result.materialization.status).toBe('fallback');
    expect(result.materialization.reason).toBe('Jina Reader returned HTTP 503');
  });

  it('rejects private article URLs before they reach Jina', async () => {
    const fetchFn = jest.fn();
    const result = await run({ article_url: 'http://127.0.0.1/private' }, fetchFn as typeof fetch);

    expect(result.materialization.status).toBe('fallback');
    expect(result.materialization.reason).toMatch(/restricted IPv4/);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
