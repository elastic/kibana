/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';

import type { EntityStoreRecord } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import type { HostItem } from '../../../../../common/search_strategy/security_solution/hosts';
import type { CriteriaFields } from '../types';

interface HostToCriteriaOptions {
  hostItem: HostItem;
  entityRecord?: EntityStoreRecord | null;
  euid?: EntityStoreEuid;
}
export const hostToCriteria = (opts: HostToCriteriaOptions): CriteriaFields[] => {
  const { hostItem, entityRecord, euid } = opts;
  if (hostItem == null) {
    return [];
  }
  if (euid) {
    const inputDoc = entityRecord ? entityRecord : hostItem;
    const scopedDsl = euid.dsl.getEuidFilterBasedOnDocument('host', inputDoc);
    if (scopedDsl != null) {
      return [];
    }
    const identifiers = euid.getEntityIdentifiersFromDocument('host', inputDoc);
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
