/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW } from '@kbn/workflows/managed/definitions/alertzero';
import { FP_TP_RAW_EVENT_PAGE_SIZE } from './constants';

interface LoadEventsStep {
  name: string;
  with?: { size?: number; sort?: Array<Record<string, string>> };
}

describe('managed FP/TP raw-event page', () => {
  const loadEvents = (
    parse(ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW.yaml) as { steps: LoadEventsStep[] }
  ).steps.find(({ name }) => name === 'load_events');

  it('returns the page size the workflow reads', () => {
    expect(loadEvents?.with?.size).toBe(FP_TP_RAW_EVENT_PAGE_SIZE);
  });

  // The truncated-events example appends its extra events after the world's own, which
  // keeps the world's events on the page only while the page is sorted oldest first.
  it('returns the page sorted oldest first', () => {
    expect(loadEvents?.with?.sort).toEqual([{ '@timestamp': 'asc' }]);
  });
});
