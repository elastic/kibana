/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndDiscoveryContext, PndProposalRow } from '@kbn/pnd-common';

import { PND_GATE_SCHEMA } from '../../../hitl_schema_form/test_helpers/pnd_gate_schema';

/**
 * A pending gate whose `inputSchema` is `{}` — the shape every PND row carries
 * today when its gate declared no schema, and therefore the one that exercises
 * the card's **fallback** branch.
 */
export const PND_HITL_PROPOSAL: PndProposalRow = {
  alwaysGate: false,
  correlationId: 'alert-1',
  createdAt: '2026-08-06T12:00:00.000Z',
  gateId: 'open_investigation',
  inputSchema: {},
  message: 'Open an investigation into the credential-dumping attack on host-1?',
  reasoning: 'Three alerts on host-1 chain to a credential access technique.',
  recommendedAction: 'investigate',
  reversible: true,
  sourceId: 'system-security-watch-deep:run-1:step-exec-1',
  stepExecutionId: 'step-exec-1',
  stepId: 'await_open_investigation',
  title: 'Open an investigation?',
  workflowId: 'system-security-watch-deep',
  workflowRunId: 'run-1',
};

/**
 * The same gate declaring the `waitForInput` schema the four managed watches
 * ship, which exercises the card's **schema** branch.
 */
export const PND_HITL_SCHEMA_PROPOSAL: PndProposalRow = {
  ...PND_HITL_PROPOSAL,
  inputSchema: { ...PND_GATE_SCHEMA },
};

/** A blast radius over all four aggregated ECS fields, highest count first. */
export const PND_HITL_DISCOVERY_CONTEXT: PndDiscoveryContext = {
  correlationId: 'alert-1',
  entities: [
    { count: 9, field: 'host.name', value: 'host-1' },
    { count: 4, field: 'user.name', value: 'cfo@corp' },
    { count: 2, field: 'source.ip', value: '10.0.0.1' },
    { count: 1, field: 'destination.ip', value: '10.0.0.2' },
  ],
  riskScore: 73,
};
