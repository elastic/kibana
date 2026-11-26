/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toAgentContextRow, toRelatedContextRow } from './read_context_rows';

describe('read_context_rows', () => {
  it('reads an agent row from the fields API', () => {
    expect(
      toAgentContextRow({
        'entity.id': ['ai_agent:claude_code@h1@ec2-user'],
        'user.name': ['ec2-user'],
        'entity.relationships.acts_on_behalf_of.ids': ['user:a@okta', 'user:a@entra_id'],
        'entity.relationships.acts_on_behalf_of.raw_identifiers.user.email': ['a@x.io'],
        'entity.relationships.depends_on.ids': ['host:h1'],
      })
    ).toEqual({
      id: 'ai_agent:claude_code@h1@ec2-user',
      userName: 'ec2-user',
      personIds: ['user:a@okta', 'user:a@entra_id'],
      personEmails: ['a@x.io'],
      hostIds: ['host:h1'],
    });
  });

  it('treats missing relationships as empty and skips rows without an ID', () => {
    expect(toAgentContextRow({ 'entity.id': ['ai_agent:x'] })).toEqual({
      id: 'ai_agent:x',
      userName: undefined,
      personIds: [],
      personEmails: [],
      hostIds: [],
    });
    expect(toAgentContextRow({ 'user.name': ['root'] })).toBeUndefined();
    expect(toAgentContextRow(undefined)).toBeUndefined();
  });

  it('reads a related row, keeping an explicit false MFA value', () => {
    expect(
      toRelatedContextRow({
        'entity.id': ['user:a@entra_id'],
        'entity.relationships.resolution.resolved_to': ['user:a@okta'],
        'entity.attributes.watchlists': ['departing'],
        'entity.attributes.mfa_enabled': [false],
        'asset.criticality': ['high_impact'],
      })
    ).toEqual({
      id: 'user:a@entra_id',
      resolvedTo: 'user:a@okta',
      watchlists: ['departing'],
      criticality: 'high_impact',
      mfaEnabled: false,
    });
  });
});
