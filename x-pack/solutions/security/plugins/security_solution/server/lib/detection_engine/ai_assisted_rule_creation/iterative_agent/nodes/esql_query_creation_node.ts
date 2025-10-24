/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetEsqlQueryGraphParams } from '../esql_query_graph';
import { getEsqlQueryGraph } from '../esql_query_graph';
import type { RuleCreationState } from '../state';

export const createEsqlQueryCreationNode = async (params: GetEsqlQueryGraphParams) => {
  const esqlGraph = await getEsqlQueryGraph(params);

  return async (state: RuleCreationState) => {
    const result = await esqlGraph.invoke(state);

    return result;
  };
};
