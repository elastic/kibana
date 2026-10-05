/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocationAgentStats } from '../../../../../common/types';
import type { PrivateLocation } from '../../../../../common/runtime_types';
import { agentStatsReducer } from '.';
import { getAgentStatsAction } from './actions';
import {
  createPrivateLocationAction,
  deletePrivateLocationAction,
  editPrivateLocationAction,
} from '../private_locations/actions';

const stats: LocationAgentStats = {
  locationId: 'loc-1',
  locationLabel: 'Local',
  agentPolicyId: 'policy-1',
  agentPolicyName: 'Synthetics policy',
  isAgentSharding: false,
  agents: [],
};

const location: PrivateLocation = {
  id: 'loc-2',
  label: 'New',
  agentPolicyId: 'policy-2',
  isServiceManaged: false,
  isInvalid: false,
};

const seeded = () => agentStatsReducer(undefined, getAgentStatsAction.success([stats]));

const fetchError = {
  name: 'Error',
  body: { message: 'Unable to load' },
  requestUrl: '/internal/synthetics/private_locations/agent_stats',
};

const seededWithError = () => agentStatsReducer(seeded(), getAgentStatsAction.fail(fetchError));

describe('agentStatsReducer', () => {
  it('clears cached stats when a private location is created, edited, or deleted', () => {
    expect(seeded().data).toEqual([stats]);

    expect(agentStatsReducer(seeded(), createPrivateLocationAction.success(location)).data).toBe(
      null
    );
    expect(agentStatsReducer(seeded(), editPrivateLocationAction.success(location)).data).toBe(
      null
    );
    expect(agentStatsReducer(seeded(), deletePrivateLocationAction.success([location])).data).toBe(
      null
    );
  });

  it('marks stats as loading and clears a previous error on create, edit, or delete success', () => {
    expect(seededWithError()).toEqual(
      expect.objectContaining({ data: [stats], loading: false, error: fetchError })
    );

    for (const action of [
      createPrivateLocationAction.success(location),
      editPrivateLocationAction.success(location),
      deletePrivateLocationAction.success([location]),
    ]) {
      expect(agentStatsReducer(seededWithError(), action)).toEqual(
        expect.objectContaining({ data: null, loading: true, error: null })
      );
    }
  });
});
