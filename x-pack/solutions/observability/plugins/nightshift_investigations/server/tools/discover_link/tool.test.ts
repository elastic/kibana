/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { DiscoverLinkLocator } from './tool';
import { createDiscoverLinkTool } from './tool';

const QUERY = 'FROM logs-* | STATS count = COUNT(*) BY minute = BUCKET(@timestamp, 1 minute)';

const run = async (
  args: Record<string, unknown>,
  deps: { locator?: DiscoverLinkLocator; kibanaUrl?: string }
): Promise<ToolResult[]> => {
  const tool = createDiscoverLinkTool({
    getDiscoverLocator: () => deps.locator,
    getKibanaUrl: () => deps.kibanaUrl,
  });
  const { results } = await (
    tool.handler as unknown as (
      args: Record<string, unknown>,
      context: unknown
    ) => Promise<{ results: ToolResult[] }>
  )(args, { spaceId: 'ops' });
  return results;
};

describe('createDiscoverLinkTool', () => {
  it.each([
    [
      { query: QUERY, start: '2026-11-23T10:00:00Z' },
      { query: { esql: QUERY }, timeRange: { from: '2026-11-23T10:00:00Z', to: 'now' } },
    ],
    [
      { query: QUERY, start: 'now-1h', end: 'now-5m' },
      { query: { esql: QUERY }, timeRange: { from: 'now-1h', to: 'now-5m' } },
    ],
  ])('links %j through the Discover locator on the public Kibana URL', async (args, params) => {
    const getRedirectUrl = jest.fn(() => '/s/ops/app/r?l=DISCOVER_APP_LOCATOR&lz=abc');

    const [result] = await run(args, {
      locator: { getRedirectUrl },
      kibanaUrl: 'https://kibana.example',
    });

    expect(getRedirectUrl).toHaveBeenCalledWith(params, { spaceId: 'ops' });
    expect(result).toEqual({
      type: ToolResultType.other,
      data: { url: 'https://kibana.example/s/ops/app/r?l=DISCOVER_APP_LOCATOR&lz=abc' },
    });
  });

  it.each([
    ['no Discover', { kibanaUrl: 'https://kibana.example' }],
    ['no public Kibana URL', { locator: { getRedirectUrl: () => '/app/r' } }],
  ])('returns an error with %s', async (_, deps) => {
    const [result] = await run({ query: QUERY, start: 'now-1h' }, deps);

    expect(result.type).toBe(ToolResultType.error);
  });
});
