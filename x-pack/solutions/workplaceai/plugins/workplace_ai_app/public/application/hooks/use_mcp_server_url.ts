/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { MCP_SERVER_PATH } from '../../../common';
import { useKibana } from './use_kibana';

export const useMcpServerUrl = () => {
  const {
    services: { http, plugins },
  } = useKibana();

  const mcpServerUrl = useMemo(() => {
    // Get the base URL, preferring publicBaseUrl, then cloud URL, then window location
    const baseUrl =
      http.basePath.publicBaseUrl ??
      plugins.cloud?.kibanaUrl ??
      `${window.location.origin}${http.basePath.get()}`;

    return `${baseUrl}${MCP_SERVER_PATH}`;
  }, [http, plugins.cloud]);

  return { mcpServerUrl };
};
