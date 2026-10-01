/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

/** Rule tag on every alert this tool creates; `clean` deletes by it. */
export const LOAD_TEST_TAG = 'triage-load-test';

export const loadTestRunTag = (runId: string): string => `${LOAD_TEST_TAG}:${runId}`;

export type AlertSource = Record<string, unknown>;

/** Alert fields that carry state of the template's own lifecycle and must not leak into a clone. */
const FIELDS_TO_DROP = [
  'kibana.alert.case_ids',
  'kibana.alert.workflow_status_updated_at',
  'kibana.alert.workflow_user',
  'kibana.alert.workflow_reason',
  'kibana.alert.suppression.docs_count',
  'kibana.alert.suppression.end',
  'kibana.alert.suppression.start',
  'kibana.alert.suppression.terms',
] as const;

/** Stable UUID-shaped id for synthetic rule `ruleIndex` of a run. */
export const buildRuleUuid = (runId: string, ruleIndex: number): string => {
  const hex = createHash('sha256')
    .update(`${LOAD_TEST_TAG}:${runId}:rule:${ruleIndex}`)
    .digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
};

export const buildAlertId = (runId: string, batchId: string, position: number): string =>
  `${LOAD_TEST_TAG}-${runId}-${batchId}-${String(position).padStart(4, '0')}`;

export interface CloneAlertParams {
  template: AlertSource;
  alertId: string;
  ruleUuid: string;
  runId: string;
  /** Shared by all alerts of one batch, like the execution uuid of a real rule run. */
  executionUuid: string;
  nowIso: string;
}

/**
 * Clones a template alert into a fresh, open alert of a synthetic rule.
 *
 * Generator tags (`data-generator`, `data-generator-fp`, `pack:*`) are replaced, because the agent
 * reads the rule's tags and they would give away the ground truth. The label travels in the
 * manifest instead.
 */
export const cloneAlert = ({
  template,
  alertId,
  ruleUuid,
  runId,
  executionUuid,
  nowIso,
}: CloneAlertParams): AlertSource => {
  if (!('kibana.alert.rule.uuid' in template)) {
    throw new Error(
      'Template is not a flattened alert document (missing "kibana.alert.rule.uuid"). ' +
        'Templates must be read from the alerts index.'
    );
  }

  const clone: AlertSource = { ...template };
  for (const field of FIELDS_TO_DROP) delete clone[field];

  clone['@timestamp'] = nowIso;
  clone['kibana.alert.uuid'] = alertId;
  clone['kibana.alert.instance.id'] = alertId;
  clone['kibana.alert.start'] = nowIso;
  clone['kibana.alert.last_detected'] = nowIso;
  clone['kibana.alert.original_time'] = nowIso;
  clone['kibana.alert.time_range'] = { gte: nowIso };
  clone['kibana.alert.status'] = 'active';
  clone['kibana.alert.workflow_status'] = 'open';
  clone['kibana.alert.workflow_tags'] = [];
  clone['kibana.alert.workflow_assignee_ids'] = [];
  clone['kibana.alert.rule.uuid'] = ruleUuid;
  clone['kibana.alert.rule.rule_id'] = ruleUuid;
  clone['kibana.alert.rule.tags'] = [LOAD_TEST_TAG, loadTestRunTag(runId)];
  clone['kibana.alert.rule.execution.uuid'] = executionUuid;

  return clone;
};
