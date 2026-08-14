/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RUM_ANALYST_AGENT_TYPE_ID, RUM_UX_TOOL_IDS } from '../../common/rum_agent';
import { registerRumTools } from './tools';

describe('registerRumTools', () => {
  it('registers the five RUM tools with bounded defaulted schemas', () => {
    const registered: Array<{ id: string; schema: { parse: (value: unknown) => unknown } }> = [];
    registerRumTools({
      agentBuilder: {
        tools: {
          register: (tool: { id: string; schema: { parse: (value: unknown) => unknown } }) => {
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

  it('uses allow-listed ids', () => {
    expect(RUM_ANALYST_AGENT_TYPE_ID).toBe('observability.ux.rum-analyst-type');
    expect(RUM_UX_TOOL_IDS.getOverview).toBe('observability.ux.get_overview');
  });
});
