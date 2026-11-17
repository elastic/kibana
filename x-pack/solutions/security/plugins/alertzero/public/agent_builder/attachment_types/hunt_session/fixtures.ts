/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const sessionState = {
  query: 'FROM logs-okta | WHERE x',
  filters: [{ json: '{"meta":{"key":"a"}}' }],
  timeRange: { from: 'now-2d', to: 'now' },
  columns: ['@timestamp', 'a'],
  dataViewId: 'dv-9',
};

const header = {
  version: 1,
  investigation_id: 'inv-1',
  definition: {
    id: 'okta_failed_oauth_public_client_scope',
    version: 1,
    name: 'Failed OAuth public client scope',
    hypothesis: 'An attacker probes OAuth scopes',
  },
  revision: 2,
};

export const manualSession = {
  ...header,
  trigger: 'manual',
  has_manual_append: false,
  preservations: [
    {
      preservation_id: 'p1',
      actor: 'analyst',
      timestamp: '2026-11-04T12:00:00.000Z',
      ...sessionState,
      evidenceFingerprints: ['a', 'b'],
      selectedEvidence: [
        { _index: 'logs-okta', _id: 'e1', 'event.action': 'deny' },
        { _index: 'logs-okta', _id: 'e2', 'event.action': 'allow' },
      ],
    },
  ],
  resumeSnapshot: sessionState,
};

export const automatedSession = {
  ...header,
  trigger: 'automated',
  has_manual_append: false,
  adjudication: {
    group_id: 'v1:abc',
    summary: 'Repeated denied scopes from one client',
    severity: 'high',
    hypotheses: ['Credential stuffing'],
    citations: [{ kind: 'raw_event', index: 'logs-okta', id: 'e1' }],
    executionWindow: { from: '2026-11-01T00:00:00Z', to: '2026-11-02T00:00:00Z' },
    query: 'FROM logs-okta',
  },
};
