/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivateLocation } from '../../../../../../common/runtime_types';
import type { NewLocation } from './add_or_edit_location_flyout';
import { getPrivateLocationEditPayload } from './get_private_location_edit_payload';

const existing: PrivateLocation = {
  id: 'loc-1',
  label: 'Local',
  agentPolicyId: 'policy-1',
  tags: ['prod'],
};

const form = (overrides: Partial<NewLocation> = {}): NewLocation => ({
  label: 'Local',
  agentPolicyId: 'policy-1',
  tags: ['prod'],
  geo: { lat: 0, lon: 0 },
  ...overrides,
});

describe('getPrivateLocationEditPayload', () => {
  it('returns null when nothing changed', () => {
    expect(getPrivateLocationEditPayload(form(), existing)).toBeNull();
  });

  it('omits isAgentSharding when only the label or tags changed', () => {
    expect(getPrivateLocationEditPayload(form({ label: 'Renamed' }), existing)).toEqual({
      label: 'Renamed',
      tags: ['prod'],
    });
  });

  it('includes isAgentSharding when the scalable toggle changes', () => {
    expect(getPrivateLocationEditPayload(form({ isAgentSharding: true }), existing)).toEqual({
      label: 'Local',
      tags: ['prod'],
      isAgentSharding: true,
    });
  });

  it('sends isAgentSharding false when turning sharding off', () => {
    expect(
      getPrivateLocationEditPayload(form({ isAgentSharding: false }), {
        ...existing,
        isAgentSharding: true,
      })
    ).toEqual({
      label: 'Local',
      tags: ['prod'],
      isAgentSharding: false,
    });
  });
});
