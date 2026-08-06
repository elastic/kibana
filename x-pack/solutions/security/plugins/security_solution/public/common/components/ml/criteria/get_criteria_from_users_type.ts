/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';
import type { EntityStoreRecord } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { UsersType } from '../../../../explore/users/store/model';
import type { CriteriaFields } from '../types';
import { getCriteriaFieldsForAnomaliesTable } from '../anomaly/anomaly_table_euid';

interface GetCriteriaFromUsersTypeOptions {
  type: UsersType;
  userName: string | undefined;
  entityRecord?: EntityStoreRecord | null;
  identityFields?: Record<string, string>;
  euid?: EntityStoreEuid;
}

export const getCriteriaFromUsersType = (
  opts: GetCriteriaFromUsersTypeOptions
): CriteriaFields[] => {
  const { type, userName, entityRecord, identityFields, euid } = opts;
  if (type !== UsersType.details || userName == null) {
    return [];
  }
  return getCriteriaFieldsForAnomaliesTable({
    euid,
    entityType: 'user',
    entityRecord,
    isScopedToEntity: true,
    identityFields,
    fallbackDisplayName: userName,
  });
};
