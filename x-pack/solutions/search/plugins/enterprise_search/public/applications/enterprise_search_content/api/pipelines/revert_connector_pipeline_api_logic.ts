/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Actions } from '../../../shared/api_logic/create_api_logic';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface RevertConnectorPipelineArgs {
  indexName: string;
}

export const revertConnectorPipeline = async ({ indexName }: RevertConnectorPipelineArgs) => {
  const route = `/internal/enterprise_search/indices/${indexName}/pipelines`;

  return await HttpLogic.values.http.delete(route);
};

export const RevertConnectorPipelineApilogic = createApiLogic(
  ['revert_connector_pipeline_api'],
  revertConnectorPipeline
);

export type RevertConnectorPipelineActions = Actions<RevertConnectorPipelineArgs, {}>;
