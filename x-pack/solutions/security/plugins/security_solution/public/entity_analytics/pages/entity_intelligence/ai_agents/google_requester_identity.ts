/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '../../../../../common/api/entity_analytics';
import type { GoogleAdkContext } from '../../../../../common/entity_intelligence/google_adk';
import { EntityType } from '../../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from '../common';
import { toIntelligenceEntity } from '../common';

type Requester = GoogleAdkContext['requester'];

export const isVerifiedGoogleUser = (requester?: Requester): requester is Requester =>
  requester?.authenticated === true &&
  requester.provenance === 'google_signed_id_token_verified_by_application' &&
  requester.principal_type === 'google_account' &&
  !requester.email.endsWith('.gserviceaccount.com');

/** Matches the recorded requester to a unique stored identity without inferring ownership or aliases. */
export const resolveGoogleRequesterEntity = (
  requester: Requester | undefined,
  records: Entity[],
  total: number
): IntelligenceEntity | undefined => {
  if (!isVerifiedGoogleUser(requester) || total !== 1 || records.length !== 1) return undefined;
  const record = records[0];
  const user = (record as { user?: { id?: string | string[]; name?: string | string[] } }).user;
  const ids = typeof user?.id === 'string' ? [user.id] : user?.id ?? [];
  const names = typeof user?.name === 'string' ? [user.name] : user?.name ?? [];
  const entity = toIntelligenceEntity(record);
  return entity?.type === EntityType.user &&
    ids.includes(requester.subject) &&
    names.includes(requester.email)
    ? entity
    : undefined;
};

export const googleRequesterEntityFilter = (requester: Requester): string =>
  JSON.stringify({
    bool: {
      filter: [
        { term: { 'user.id': requester.subject } },
        { term: { 'user.name': requester.email } },
      ],
    },
  });
