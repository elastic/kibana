/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/inference-common';
import { generateRumReportNarrative } from './generate_rum_report_narrative';
import type { RumScorecardReport } from '../../common/rum_report';

const report = {
  templateId: 'scorecard',
  title: 'Weekly UX scorecard',
  serviceName: 'shop',
  rangeFrom: '2026-08-03T00:00:00.000Z',
  rangeTo: '2026-08-10T00:00:00.000Z',
  compareFrom: null,
  compareTo: null,
  generatedAt: '2026-08-14T00:00:00.000Z',
  noPreviousPeriod: true,
  kpis: {
    sessions: { current: 10, previous: null, abs: null, pct: null },
    pageViews: { current: 20, previous: null, abs: null, pct: null },
    errorRate: { current: 0.1, previous: null, abs: null, pct: null },
    bounceRate: { current: 0.4, previous: null, abs: null, pct: null },
    p75LoadMs: { current: 1200, previous: null, abs: null, pct: null },
    p75Inp: { current: 180, previous: null, abs: null, pct: null },
  },
  vitals: {
    lcp: { p75: 2000, ranks: null, samples: 1 },
    inp: { p75: null, ranks: null, samples: 0 },
    cls: { p75: null, ranks: null, samples: 0 },
    fcp: { p75: null, ranks: null, samples: 0 },
  },
  vitalsPrevious: null,
  trends: [],
  frustration: {
    rageSessions: 0,
    errorSessions: 0,
    deadClickSessions: 0,
    rageClicks: 0,
    deadClicks: 0,
    errorClicks: 0,
  },
  frustrationPrevious: null,
  topPages: [],
  errorGroups: [],
  sampleSessions: [],
  browsers: [],
  os: [],
  countries: [],
} as RumScorecardReport;

describe('generateRumReportNarrative', () => {
  it('calls chatComplete with the report context and returns the model text', async () => {
    const chatComplete = jest.fn().mockResolvedValue({
      content: '  Error rate needs attention.  ',
    });
    const inference = {
      getConnectorById: jest.fn().mockResolvedValue({ connectorId: 'genai-1' }),
      getDefaultConnector: jest.fn(),
      getClient: jest.fn().mockReturnValue({ chatComplete }),
    };
    const request = {} as never;

    const narrative = await generateRumReportNarrative({
      inference: inference as never,
      request,
      report,
      connectorId: 'genai-1',
    });

    expect(narrative).toBe('Error rate needs attention.');
    expect(inference.getConnectorById).toHaveBeenCalledWith('genai-1', request);
    expect(chatComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId: 'genai-1',
        messages: [
          expect.objectContaining({
            role: MessageRole.User,
            content: expect.stringContaining('Weekly UX scorecard'),
          }),
        ],
      })
    );
  });

  it('throws when no GenAI connector is configured', async () => {
    await expect(
      generateRumReportNarrative({
        inference: {
          getDefaultConnector: jest.fn().mockResolvedValue(undefined),
          getClient: jest.fn(),
        } as never,
        request: {} as never,
        report,
      })
    ).rejects.toThrow('No GenAI connector is configured');
  });
});
