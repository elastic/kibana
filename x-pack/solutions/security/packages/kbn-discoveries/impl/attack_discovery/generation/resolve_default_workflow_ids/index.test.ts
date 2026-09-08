/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
} from '@kbn/workflows/managed';

import { resolveDefaultWorkflowIds } from '.';

describe('resolveDefaultWorkflowIds', () => {
  it('returns the system-workflow ID constants without making any API calls', () => {
    const result = resolveDefaultWorkflowIds();

    expect(result).toEqual({
      default_alert_retrieval: ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
      generation: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
      validate: ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
    });
  });

  it('returns the expected constant values', () => {
    const result = resolveDefaultWorkflowIds();

    expect(result).toEqual({
      default_alert_retrieval: 'system-attack-discovery-alert-retrieval',
      generation: 'system-attack-discovery-generation',
      validate: 'system-attack-discovery-validate',
    });
  });
});
