/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '../../../../../common/api/entity_analytics';
import type { GoogleAdkContext } from '../../../../../common/entity_intelligence/google_adk';
import {
  googleRequesterEntityFilter,
  isVerifiedGoogleUser,
  resolveGoogleRequesterEntity,
} from './google_requester_identity';

const requester: GoogleAdkContext['requester'] = {
  subject: 'verified-subject',
  email: 'person@example.com',
  authenticated: true,
  principal_type: 'google_account',
  provenance: 'google_signed_id_token_verified_by_application',
  human_identity: 'account_level_only',
};
const record = {
  user: { id: 'verified-subject', name: 'person@example.com' },
  entity: {
    id: 'user:canonical-subject',
    name: 'Stored identity',
    EngineMetadata: { Type: 'user' },
  },
} as Entity;

it('returns the actual canonical identity only when subject and email match uniquely', () => {
  expect(resolveGoogleRequesterEntity(requester, [record], 1)?.id).toBe('user:canonical-subject');
  expect(
    resolveGoogleRequesterEntity(
      requester,
      [{ ...record, user: { id: [requester.subject], name: requester.email } } as Entity],
      1
    )?.id
  ).toBe('user:canonical-subject');
  expect(resolveGoogleRequesterEntity(requester, [record], 2)).toBeUndefined();
  expect(
    resolveGoogleRequesterEntity({ ...requester, subject: 'different' }, [record], 1)
  ).toBeUndefined();
  expect(
    resolveGoogleRequesterEntity({ ...requester, email: 'owner@example.com' }, [record], 1)
  ).toBeUndefined();
});

it('does not use service-account ownership or an unclassified principal as a human requester', () => {
  expect(isVerifiedGoogleUser({ ...requester, principal_type: 'service_account' })).toBe(false);
  expect(isVerifiedGoogleUser({ ...requester, principal_type: undefined })).toBe(false);
  expect(
    isVerifiedGoogleUser({ ...requester, email: 'runtime@project.iam.gserviceaccount.com' })
  ).toBe(false);
  expect(resolveGoogleRequesterEntity(undefined, [record], 1)).toBeUndefined();
});

it('queries exact terms instead of expanding a user-controlled display name', () => {
  expect(JSON.parse(googleRequesterEntityFilter(requester))).toEqual({
    bool: {
      filter: [
        { term: { 'user.id': requester.subject } },
        { term: { 'user.name': requester.email } },
      ],
    },
  });
});
