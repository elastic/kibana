/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_IDS } from '@kbn/pnd-common';
import type { PndGateId } from '@kbn/pnd-common';

import type { PndSchemaFormSchema } from '../../types';

/**
 * The `waitForInput` schema the managed watches declare, copied verbatim from
 * `kbn-workflows/managed/definitions/pnd/watch_deep.yaml` and
 * `watch_post_incident.yaml`. All four gates ship the same one, which is why the
 * form only ever has to render a select plus a text field in production.
 */
export const PND_GATE_SCHEMA: PndSchemaFormSchema = {
  properties: {
    decision: { enum: ['approve', 'dismiss'], type: 'string' },
    rationale: { type: 'string' },
  },
  required: ['decision', 'rationale'],
  type: 'object',
};

/**
 * The schema of each of the four registered gates, keyed by gate id, so a test
 * asserting "every real PND gate renders" fails loudly if one of them ever
 * diverges from {@link PND_GATE_SCHEMA}.
 */
export const PND_GATE_SCHEMAS: Readonly<Record<PndGateId, PndSchemaFormSchema>> = {
  [PND_GATE_IDS.applyTuning]: PND_GATE_SCHEMA,
  [PND_GATE_IDS.incidentContained]: PND_GATE_SCHEMA,
  [PND_GATE_IDS.openInvestigation]: PND_GATE_SCHEMA,
  [PND_GATE_IDS.promoteIncident]: PND_GATE_SCHEMA,
};
