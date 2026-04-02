/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';

import type { HostItem } from '../../../../../common/search_strategy/security_solution/hosts';
import type { CriteriaFields } from '../types';

export const hostToCriteria = (hostItem: HostItem, euid?: EntityStoreEuid): CriteriaFields[] => {
  if (hostItem == null) {
    return [];
  }
  if (euid) {
    const scopedDsl = euid.dsl.getEuidFilterBasedOnDocument('host', hostItem);
    if (scopedDsl != null) {
      return [];
    }
    const identifiers = euid.getEntityIdentifiersFromDocument('host', hostItem);
    if (identifiers != null && Object.keys(identifiers).length > 0) {
      return Object.entries(identifiers).map(([fieldName, fieldValue]) => ({
        fieldName,
        fieldValue,
      }));
    }
  }
  if (hostItem.host == null) {
    return [];
  }
  const hostId = hostItem.host.id?.[0];
  if (typeof hostId === 'string' && hostId.trim() !== '') {
    return [{ fieldName: 'host.id', fieldValue: hostId.trim() }];
  }
  if (hostItem.host.name != null) {
    return [
      {
        fieldName: 'host.name',
        fieldValue: hostItem.host.name[0],
      },
    ];
  }
  return [];
};
