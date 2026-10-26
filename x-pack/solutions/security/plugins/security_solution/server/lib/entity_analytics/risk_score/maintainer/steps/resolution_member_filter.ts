/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { euid, getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import { ALERT_ENTITY_ID } from '../../../../../../common/field_maps/field_names';

/** Elasticsearch's default `index.max_terms_count`, the most values one terms query accepts. */
export const MAX_RESOLUTION_PAGE_MEMBERS = 65_536;

/**
 * Narrows a resolution page's scoring query to the alerts that can belong to its groups.
 *
 * The page's groups are only known after the lookup join, so without this every page reads every
 * alert of the entity type. An alert stamped with this type's entity ID is kept only when that ID
 * is one of the page's members. An alert without this type's stamp is always kept, since the query
 * still works out its entity ID itself, so the filter is exact whatever share of alerts is stamped
 * and only gets faster as that share grows. The check is per type: an alert stamped for another
 * type only can still belong to a group of this one.
 *
 * Returns undefined when there are no members or more than a terms query accepts, and the page
 * then reads every alert as before.
 */
export const getResolutionPageMemberFilter = (
  entityType: EntityType,
  memberIds: string[]
): QueryDslQueryContainer | undefined => {
  if (memberIds.length === 0 || memberIds.length > MAX_RESOLUTION_PAGE_MEMBERS) {
    return undefined;
  }

  return {
    bool: {
      should: [
        { terms: { [ALERT_ENTITY_ID]: memberIds } },
        {
          bool: {
            filter: [
              euid.dsl.getEuidDocumentsContainsIdFilter(getBuiltInEntityDefinition(entityType)),
            ],
            must_not: [{ prefix: { [ALERT_ENTITY_ID]: `${entityType}:` } }],
          },
        },
      ],
      minimum_should_match: 1,
    },
  };
};
