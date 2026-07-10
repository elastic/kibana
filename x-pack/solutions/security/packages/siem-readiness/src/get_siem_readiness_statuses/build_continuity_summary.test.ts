/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionableFinding } from '../types';
import { buildContinuitySummary, SERVERLESS_FAILURE_RATE_NOTE } from './build_continuity_summary';

const makeFinding = (type: ActionableFinding['type']): ActionableFinding => ({
  severity: 'CRITICAL',
  type,
  message: 'test',
  resource: 'pipe',
});

describe('buildContinuitySummary', () => {
  it('returns noDataMessage for noData status', () => {
    expect(
      buildContinuitySummary({
        status: 'noData',
        pipelineCount: 0,
        findings: [],
        isServerless: false,
        noDataMessage: 'No active ingest pipelines found.',
      })
    ).toBe('No active ingest pipelines found.');
  });

  it('appends serverless note on noData when isServerless', () => {
    expect(
      buildContinuitySummary({
        status: 'noData',
        pipelineCount: 0,
        findings: [],
        isServerless: true,
        noDataMessage: 'No active ingest pipelines found.',
      })
    ).toBe(`No active ingest pipelines found.${SERVERLESS_FAILURE_RATE_NOTE}`);
  });

  it('returns healthy summary when there are no findings', () => {
    expect(
      buildContinuitySummary({
        status: 'healthy',
        pipelineCount: 3,
        findings: [],
        isServerless: false,
        noDataMessage: 'unused',
      })
    ).toBe('All 3 active ingest pipelines are healthy.');
  });

  it('appends serverless note on healthy when isServerless', () => {
    expect(
      buildContinuitySummary({
        status: 'healthy',
        pipelineCount: 2,
        findings: [],
        isServerless: true,
        noDataMessage: 'unused',
      })
    ).toBe(`All 2 active ingest pipelines are healthy.${SERVERLESS_FAILURE_RATE_NOTE}`);
  });

  it('builds findings summary with all finding types', () => {
    const findings = [
      makeFinding('silence'),
      makeFinding('volume_drop_critical'),
      makeFinding('volume_drop_warning'),
      makeFinding('pipeline_failure'),
    ];

    expect(
      buildContinuitySummary({
        status: 'actionsRequired',
        pipelineCount: 5,
        findings,
        isServerless: false,
        noDataMessage: 'unused',
      })
    ).toBe(
      '1 silent, 1 critical volume drop, 1 volume drop warning, 1 pipeline failure across 5 active pipelines.'
    );
  });

  it('appends serverless note on actionsRequired when isServerless', () => {
    expect(
      buildContinuitySummary({
        status: 'actionsRequired',
        pipelineCount: 1,
        findings: [makeFinding('silence')],
        isServerless: true,
        noDataMessage: 'unused',
      })
    ).toBe(`1 silent across 1 active pipelines.${SERVERLESS_FAILURE_RATE_NOTE}`);
  });

  it('uses caller-supplied noDataMessage for tool vs dimension surfaces', () => {
    expect(
      buildContinuitySummary({
        status: 'noData',
        pipelineCount: 0,
        findings: [],
        isServerless: false,
        noDataMessage: 'No ingest pipeline statistics available for categorized indices.',
      })
    ).toBe('No ingest pipeline statistics available for categorized indices.');
  });
});
