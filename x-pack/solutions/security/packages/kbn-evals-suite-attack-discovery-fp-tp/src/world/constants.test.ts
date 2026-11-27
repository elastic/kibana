/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW } from '@kbn/workflows/managed/definitions/alertzero';
import { FP_TP_RAW_EVENT_BRANCH_SIZE } from './constants';

interface SearchStep {
  name: string;
  with?: { size?: number; sort?: Array<Record<string, string>> };
  steps?: SearchStep[];
}

describe('managed FP/TP raw-event page', () => {
  const searches = (
    parse(ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW.yaml) as { steps: SearchStep[] }
  ).steps
    .filter(({ name }) => name === 'load_events_per_alert')
    .flatMap(({ steps }) => steps ?? [])
    .filter(({ name }) => name === 'search_alert_window');

  it('returns the per-alert page size the workflow reads', () => {
    expect(searches.map((step) => step.with?.size)).toEqual([FP_TP_RAW_EVENT_BRANCH_SIZE]);
  });

  // The truncated-events example appends its extra events after the world's own, which
  // keeps the world's events on the page only while the page is sorted oldest first.
  it('returns the page sorted oldest first', () => {
    expect(searches.map((step) => step.with?.sort)).toEqual([[{ '@timestamp': 'asc' }]]);
  });

  // `load_events` renders `branches_truncated` with a hardcoded Liquid `> N`
  // that must equal the branch size, or truncation fires at the wrong page.
  it('truncates a branch at the same size the branch search uses', () => {
    const yaml = ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW.yaml;
    const loadEvents = /^ {2}- name: load_events\n([\s\S]*?)(?=^ {2}- name: )/m.exec(yaml);
    const [, threshold = ''] =
      /branches_truncated:[\s\S]*?hits\.total\.value > (\d+)/.exec(loadEvents?.[1] ?? yaml) ?? [];

    expect(Number(threshold)).toBe(FP_TP_RAW_EVENT_BRANCH_SIZE);
  });
});
