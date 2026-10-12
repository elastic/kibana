/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { INVESTIGATION_PROGRESS_UI_EVENT } from '@kbn/significant-events-schema';
import {
  createInvestigationProgressReportTool,
  SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID,
} from './tool';

const availability = { cacheMode: 'space' as const, handler: jest.fn() };

const createTool = () =>
  createInvestigationProgressReportTool({
    logger: loggerMock.create(),
    availability,
  });

const chart = {
  type: 'line' as const,
  title: 'Checkout errors',
  x_axis: { type: 'time' as const },
  y_axis: {},
  series: [{ name: 'errors', points: [{ x: '2026-07-28T14:00:00Z', y: 3 }] }],
};

describe('investigation_progress_report tool', () => {
  it('uses the expected tool id', () => {
    const tool = createTool();

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID);
  });

  // Without this the tool stays listed in the catalog after investigations become unavailable.
  it('is gated by the availability check it was given', () => {
    const tool = createTool();

    expect(tool.availability).toBe(availability);
  });

  it('requires and ranks confidence-scored current output', () => {
    const tool = createTool();
    const baseState = { summary: 'Investigation complete.', hypotheses: [] };

    expect(() =>
      tool.schema.parse({ ...baseState, recommendations: [{ title: 'Restart the service' }] })
    ).toThrow();

    const parsed = tool.schema.parse({
      ...baseState,
      recommendations: [
        { title: 'Lower relevance', confidence: 0.5 },
        { title: 'Higher relevance', confidence: 0.9 },
      ],
    });

    expect(parsed.recommendations?.map(({ title }) => title)).toEqual([
      'Higher relevance',
      'Lower relevance',
    ]);
  });

  it('emits a tool_ui event with the full reported state and acknowledges', async () => {
    const tool = createTool();
    const context = agentBuilderMocks.tools.createHandlerContext();

    const state = {
      summary: 'Latency spike correlates with a deploy at 14:02.',
      hypotheses: [
        {
          candidate: 'Disk saturation',
          confidence: 0.1,
          status: 'dismissed' as const,
          reason: 'IOPS stayed flat throughout.',
        },
        {
          candidate: 'Connection pool exhaustion after the 14:02 deploy',
          confidence: 0.6,
          status: 'investigating' as const,
        },
      ],
    };

    const result = await tool.handler(state, context);

    expect(context.events.sendUiEvent).toHaveBeenCalledWith(INVESTIGATION_PROGRESS_UI_EVENT, state);
    if ('results' in result) {
      expect(result.results[0].data).toEqual({ acknowledged: true });
    } else {
      throw new Error('Expected a standard tool result');
    }
  });

  it('warns the agent when more than one hypothesis is confirmed', async () => {
    const tool = createTool();
    const context = agentBuilderMocks.tools.createHandlerContext();

    const state = {
      summary: 'Two candidates look confirmed.',
      hypotheses: [
        { candidate: 'Expired license', confidence: 0.97, status: 'confirmed' as const },
        { candidate: 'Task Manager saturation', confidence: 0.92, status: 'confirmed' as const },
      ],
    };

    const result = await tool.handler(state, context);

    expect(context.events.sendUiEvent).toHaveBeenCalledWith(INVESTIGATION_PROGRESS_UI_EVENT, state);
    if ('results' in result) {
      expect(result.results[0].data).toEqual({
        acknowledged: true,
        warning: expect.stringContaining('More than one hypothesis is "confirmed"'),
      });
    } else {
      throw new Error('Expected a standard tool result');
    }
  });

  it.each([
    [
      'a single entity with evidence',
      { summary: 'Checkout failed.', entities: [{ name: 'checkout', evidence: { chart } }] },
      'The impact lists a single entity',
    ],
    [
      'both top-level evidence and entities',
      {
        summary: 'Checkout failed.',
        evidence: { chart },
        entities: [{ name: 'checkout' }, { name: 'payments' }],
      },
      'both a top-level "evidence" and "entities"',
    ],
  ])('warns the agent when the impact has %s', async (_label, impact, expected) => {
    const tool = createTool();
    const context = agentBuilderMocks.tools.createHandlerContext();

    const result = await tool.handler(
      { summary: 'Checkout failed.', hypotheses: [], impact },
      context
    );

    if ('results' in result) {
      expect(result.results[0].data).toEqual({
        acknowledged: true,
        warning: expect.stringContaining(expected),
      });
    } else {
      throw new Error('Expected a standard tool result');
    }
  });

  it('does not warn about a seeded single entity without evidence', async () => {
    const tool = createTool();
    const context = agentBuilderMocks.tools.createHandlerContext();

    const result = await tool.handler(
      { summary: 'Checkout failed.', hypotheses: [], impact: { entities: [{ name: 'checkout' }] } },
      context
    );

    if ('results' in result) {
      expect(result.results[0].data).toEqual({ acknowledged: true });
    } else {
      throw new Error('Expected a standard tool result');
    }
  });
});
