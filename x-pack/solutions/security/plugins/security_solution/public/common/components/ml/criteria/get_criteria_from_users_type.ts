/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';

import { UsersType } from '../../../../explore/users/store/model';
import type { CriteriaFields } from '../types';
import { getCriteriaFieldsForAnomaliesTable } from '../anomaly/anomaly_table_euid';

export const getCriteriaFromUsersType = (
  type: UsersType,
  userName: string | undefined,
  identityFields?: Record<string, string>,
  euid?: EntityStoreEuid
): CriteriaFields[] => {
  if (type !== UsersType.details || userName == null) {
    return [];
  }
  return getCriteriaFieldsForAnomaliesTable({
    euid,
    entityType: 'user',
    isScopedToEntity: true,
    identityFields,
    fallbackDisplayName: userName,
  });
};
