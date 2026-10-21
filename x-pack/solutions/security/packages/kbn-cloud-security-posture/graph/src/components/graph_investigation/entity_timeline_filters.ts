/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BooleanRelation, buildCombinedFilter } from '@kbn/es-query';
import type { Filter } from '@kbn/es-query';
import type { EntityNodeViewModel } from '../types';
import type { EuidFilterApi } from '../popovers/node_expand/get_entity_expand_items';
import {
  getEntityFilterSpec,
  getEntityFilterSpecClauses,
  getSourceFieldsFromNode,
} from '../popovers/node_expand/get_entity_expand_items';
import { addEntityFilter, addFilter } from '../filters/search_filters';

/** Builds event filters for an origin entity in either role using the node actions' identity mapping. */
export const getEntityTimelineFilter = (
  node: EntityNodeViewModel,
  dataViewId: string,
  euidApi: EuidFilterApi | undefined
): Filter | undefined => {
  const sourceFields = getSourceFieldsFromNode(node);
  const roleFilters: Filter[] = [];

  for (const role of ['actor', 'target'] as const) {
    const spec = getEntityFilterSpec(node.id, sourceFields, euidApi, role);
    if (!spec) return undefined;

    const filters = getEntityFilterSpecClauses(spec, role).reduce<Filter[]>((previous, clause) => {
      if (clause.type === 'equals') {
        return addFilter(dataViewId, previous, clause.field, clause.value);
      }
      return addEntityFilter(
        dataViewId,
        previous,
        `${node.id}|${role}`,
        clause.dsl,
        clause.namespaceSourceValues,
        clause.getNamespaceSourcePrefix
      );
    }, []);
    if (filters.length === 0) return undefined;
    roleFilters.push(...filters);
  }

  return buildCombinedFilter(BooleanRelation.OR, roleFilters, { id: dataViewId });
};
