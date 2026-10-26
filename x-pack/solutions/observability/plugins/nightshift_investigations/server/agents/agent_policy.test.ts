/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_ASSISTANT_AGENT_ID, NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../common';
import { usesDecisionTrees, usesKnowledge } from './agent_policy';

describe('Nightshift agent policy', () => {
  it.each([
    [NIGHTSHIFT_INVESTIGATION_AGENT_ID, true, true],
    [` ${NIGHTSHIFT_INVESTIGATION_AGENT_ID} `, true, true],
    [NIGHTSHIFT_ASSISTANT_AGENT_ID, true, false],
    ['elastic-ai-agent', false, false],
    ['', false, false],
    [undefined, false, false],
  ])('agent %p: knowledge %p, decision trees %p', (agentId, knowledge, decisionTrees) => {
    expect(usesKnowledge(agentId)).toBe(knowledge);
    expect(usesDecisionTrees(agentId)).toBe(decisionTrees);
  });
});
