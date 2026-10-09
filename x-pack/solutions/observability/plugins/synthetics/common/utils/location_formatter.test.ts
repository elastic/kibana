/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatLocation } from './location_formatter';
import type { PrivateLocation } from '../runtime_types';

describe('formatLocation', () => {
  const privateLocation: PrivateLocation = {
    label: 'Loc',
    id: 'loc-1',
    agentPolicyId: 'ap-1',
    isServiceManaged: false,
  };

  it('carries isAgentSharding for a scalable private location', () => {
    expect(formatLocation({ ...privateLocation, isAgentSharding: true })).toEqual(
      expect.objectContaining({
        id: 'loc-1',
        agentPolicyId: 'ap-1',
        isAgentSharding: true,
      })
    );
  });

  it('does not add isAgentSharding for a classic private location', () => {
    expect(formatLocation(privateLocation)).not.toHaveProperty('isAgentSharding');
  });

  it('omits isAgentSharding: false', () => {
    expect(formatLocation({ ...privateLocation, isAgentSharding: false })).not.toHaveProperty(
      'isAgentSharding'
    );
  });
});
