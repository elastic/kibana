/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getConvertEsqlSchemaCisToEcs,
  type GetConvertEsqlSchemaCisToEcsParams,
} from '../../../../../../../common/task/agent/helpers/convert_esql_schema_cim_to_ecs';
import type { GraphNode } from '../../types';

export const getEcsMappingNode = (params: GetConvertEsqlSchemaCisToEcsParams): GraphNode => {
  const convertEsqlSchemaCimToEcs = getConvertEsqlSchemaCisToEcs(params);
  return async (state) => {
    const { query, comments } = await convertEsqlSchemaCimToEcs({
      title: state.parsed_panel.title ?? '',
      description: state.description ?? '',
      query: state.esql_query ?? '',
      originalQuery: state.inline_query ?? '',
    });

    // Set includes_ecs_mapping to indicate that this node has been executed to ensure it only runs once
    return {
      includes_ecs_mapping: true,
      comments,
      ...(query && { esql_query: query }),
    };
  };
};
