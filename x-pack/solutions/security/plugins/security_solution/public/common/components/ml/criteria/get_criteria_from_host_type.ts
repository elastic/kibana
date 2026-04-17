/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';

import { HostsType } from '../../../../explore/hosts/store/model';
import type { CriteriaFields } from '../types';
import { getCriteriaFieldsForAnomaliesTable } from '../anomaly/anomaly_table_euid';

export const getCriteriaFromHostType = (
  type: HostsType,
  hostName: string | undefined,
  identityFields?: Record<string, string>,
  euid?: EntityStoreEuid
): CriteriaFields[] => {
  if (type !== HostsType.details || hostName == null) {
    return [];
  }
  return getCriteriaFieldsForAnomaliesTable({
    euid,
    entityType: 'host',
    isScopedToEntity: true,
    identityFields,
    fallbackDisplayName: hostName,
  });
};
