/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { getAgentPolicySpaceIds } from './add_private_location';

const agentPolicy = (space_ids?: string[]) => ({ space_ids } as AgentPolicy);

describe('getAgentPolicySpaceIds', () => {
  it('maps an empty space_ids to all spaces when Fleet space awareness is off', () => {
    expect(getAgentPolicySpaceIds(agentPolicy([]))).toEqual([ALL_SPACES_ID]);
  });

  it('maps an undefined space_ids to all spaces', () => {
    expect(getAgentPolicySpaceIds(agentPolicy(undefined))).toEqual([ALL_SPACES_ID]);
  });

  it('normalizes to all spaces when the policy already includes the all-spaces id', () => {
    expect(getAgentPolicySpaceIds(agentPolicy([ALL_SPACES_ID, 'default']))).toEqual([
      ALL_SPACES_ID,
    ]);
  });

  it('returns the policy space ids when scoped to specific spaces', () => {
    expect(getAgentPolicySpaceIds(agentPolicy(['default', 'other']))).toEqual(['default', 'other']);
  });
});
