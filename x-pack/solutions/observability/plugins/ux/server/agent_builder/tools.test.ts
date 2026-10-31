/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RUM_ANALYST_AGENT_TYPE_ID,
  RUM_ANALYST_SKILL_IDS,
  RUM_UX_TOOL_IDS,
} from '../../common/rum_agent';
import { registerRumTools } from './tools';

jest.mock('../routes/rum/reports', () => ({
  fetchOverview: jest.fn(),
  fetchSessions: jest.fn(),
  fetchErrors: jest.fn(),
  fetchPages: jest.fn(),
  buildRumReport: jest.fn(),
}));

jest.mock('./resources', () => ({
  createUxRouteResources: jest.fn(() => ({ mocked: true })),
}));

import { fetchSessions } from '../routes/rum/reports';

describe('registerRumTools', () => {
  it('registers the five RUM tools with bounded defaulted schemas', () => {
    const registered: Array<{
      id: string;
      schema: { parse: (value: unknown) => unknown };
      annotations: { readOnlyHint: boolean };
    }> = [];
    registerRumTools({
      agentBuilder: {
        tools: {
          register: (tool: {
            id: string;
            schema: { parse: (value: unknown) => unknown };
            annotations: { readOnlyHint: boolean };
          }) => {
            registered.push(tool);
          },
        },
      } as unknown as Parameters<typeof registerRumTools>[0]['agentBuilder'],
      core: {} as Parameters<typeof registerRumTools>[0]['core'],
      logger: { error: jest.fn() } as unknown as Parameters<typeof registerRumTools>[0]['logger'],
    });

    expect(registered.map((tool) => tool.id)).toEqual([
      RUM_UX_TOOL_IDS.getOverview,
      RUM_UX_TOOL_IDS.findSessions,
      RUM_UX_TOOL_IDS.getErrors,
      RUM_UX_TOOL_IDS.getPages,
      RUM_UX_TOOL_IDS.getReport,
    ]);
    expect(registered.every((tool) => tool.annotations.readOnlyHint === true)).toBe(true);

    expect(registered[0].schema.parse({})).toEqual(
      expect.objectContaining({ start: 'now-24h', end: 'now' })
    );
    expect(() => registered[0].schema.parse({ kuery: 'x'.repeat(5000) })).toThrow();

    const reportParsed = registered[4].schema.parse({ templateId: 'scorecard' }) as {
      templateId: string;
      compare: string;
    };
    expect(reportParsed.templateId).toBe('scorecard');
    expect(reportParsed.compare).toBe('previous');
  });

  it('findSessions requests page 0 so the top sorted sessions are not skipped', async () => {
    const fetchSessionsMock = fetchSessions as jest.MockedFunction<typeof fetchSessions>;
    fetchSessionsMock.mockResolvedValue({
      sessions: [],
      total: 0,
      facets: {
        browsers: [],
        os: [],
        countries: [],
        users: [],
        hasReplay: 0,
        hasErrors: 0,
        hasRage: 0,
        hasBounced: 0,
      },
      stats: {
        total: 0,
        withReplay: 0,
        withErrors: 0,
        rageClicks: 0,
        medianDurationMs: 0,
        bounced: 0,
        viewed: 0,
      },
    });

    let findSessions: {
      handler: (params: unknown, context: unknown) => Promise<unknown>;
      schema: { parse: (value: unknown) => unknown };
    } | null = null;

    registerRumTools({
      agentBuilder: {
        tools: {
          register: (tool: {
            id: string;
            handler: (params: unknown, context: unknown) => Promise<unknown>;
            schema: { parse: (value: unknown) => unknown };
          }) => {
            if (tool.id === RUM_UX_TOOL_IDS.findSessions) {
              findSessions = tool;
            }
          },
        },
      } as unknown as Parameters<typeof registerRumTools>[0]['agentBuilder'],
      core: {} as Parameters<typeof registerRumTools>[0]['core'],
      logger: { error: jest.fn() } as unknown as Parameters<typeof registerRumTools>[0]['logger'],
    });

    expect(findSessions).not.toBeNull();
    const params = findSessions!.schema.parse({ limit: 10 });
    await findSessions!.handler(params, {
      esClient: {},
      request: {},
      logger: { error: jest.fn() },
    });

    expect(fetchSessionsMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ page: '0', perPage: '10' })
    );
  });

  it('uses allow-listed ids', () => {
    expect(RUM_ANALYST_AGENT_TYPE_ID).toBe('observability.ux.rum-analyst-type');
    expect(RUM_UX_TOOL_IDS.getOverview).toBe('observability.ux.get_overview');
    expect([...RUM_ANALYST_SKILL_IDS]).toEqual([
      'observability.ux.rum-slow-users',
      'observability.ux.rum-slow-pages',
      'observability.ux.rum-errors',
      'observability.ux.rum-frustration',
      'observability.ux.rum-report',
    ]);
  });
});
