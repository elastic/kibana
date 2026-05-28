/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MCP_SERVER_PATH } from '@kbn/agent-builder-plugin/public';

import { useKibanaUrl } from './use_kibana_url';

export const useAgentBuilderMcpUrl = (): string => {
  const { kibanaUrl } = useKibanaUrl();
  return `${kibanaUrl}${MCP_SERVER_PATH}`;
};
