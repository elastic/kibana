/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { PND_WATCH_WORKFLOW_IDS } from '@kbn/pnd-common';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '@kbn/workflows-management-plugin/common';

import { PND_ACTIVITY_STEP_IDS } from '../resolve_activity_action';
import { resolveActivityWindow } from '../resolve_activity_window';
import { buildActivityQuery } from '.';

const NOW = Date.parse('2026-08-06T14:37:21.123Z');
const SPACE_ID = 'agent-3';

const query = () => buildActivityQuery({ now: NOW, spaceId: SPACE_ID });

const filters = (): estypes.QueryDslQueryContainer[] => {
  const { filter } = query().query?.bool ?? {};

  if (!Array.isArray(filter)) {
    throw new Error('expected the query to be a bool filter array');
  }

  return filter;
};

describe('buildActivityQuery', () => {
  it('reads the workflows step-executions index', () => {
    expect(query().index).toEqual(WORKFLOWS_STEP_EXECUTIONS_INDEX);
  });

  it('is aggregation-only, so no document content can leave the server (mitigation 4)', () => {
    expect(query().size).toEqual(0);
  });

  it('never asks for `_source` (mitigation 4)', () => {
    expect(query()._source).toBeUndefined();
  });

  it("hard-filters to the caller's space (mitigation 3)", () => {
    expect(filters()).toContainEqual({ term: { spaceId: SPACE_ID } });
  });

  it('hard-filters to the PND watch workflow ids (mitigation 2)', () => {
    expect(filters()).toContainEqual({ terms: { workflowId: [...PND_WATCH_WORKFLOW_IDS] } });
  });

  it('hard-filters to the four registry step ids (mitigation 2)', () => {
    expect(filters()).toContainEqual({ terms: { stepId: [...PND_ACTIVITY_STEP_IDS] } });
  });

  it('filters to the `waitForInput` step type', () => {
    expect(filters()).toContainEqual({ term: { stepType: 'waitForInput' } });
  });

  it('bounds the read to the resolved 24-hour window', () => {
    expect(filters()).toContainEqual({
      range: { startedAt: { gte: resolveActivityWindow(NOW).start } },
    });
  });

  it('tolerates a cluster where no workflow has ever run', () => {
    expect(query().ignore_unavailable).toBe(true);
  });

  it('buckets hourly on the step start time', () => {
    expect(query().aggs?.by_hour.date_histogram).toEqual({
      extended_bounds: {
        max: resolveActivityWindow(NOW).end,
        min: resolveActivityWindow(NOW).start,
      },
      field: 'startedAt',
      fixed_interval: '1h',
      min_doc_count: 0,
    });
  });

  it('sub-aggregates each hour by step id, because category is not a mapped field (G4)', () => {
    expect(query().aggs?.by_hour.aggs?.by_step_id.terms).toEqual({
      field: 'stepId',
      size: PND_ACTIVITY_STEP_IDS.length,
    });
  });
});
