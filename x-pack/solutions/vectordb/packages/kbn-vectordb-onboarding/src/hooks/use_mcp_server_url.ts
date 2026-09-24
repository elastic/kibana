/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { addSpaceIdToPath, getSpaceIdFromPath } from '@kbn/core-spaces-common';
import { MCP_SERVER_PATH } from '@kbn/agent-builder-plugin/public';
import { useKibana } from '../services';

export const useMcpServerUrl = (): string => {
  const {
    services: { http, cloud },
  } = useKibana();

  return useMemo(() => {
    const { serverBasePath } = http.basePath;
    const baseUrl =
      http.basePath.publicBaseUrl ??
      cloud?.kibanaUrl ??
      `${window.location.origin}${http.basePath.get()}`;

    // `publicBaseUrl` and `cloud.kibanaUrl` are space-agnostic, so add the
    // current space prefix (derived from the request base path) if missing.
    const { spaceId } = getSpaceIdFromPath(http.basePath.get(), serverBasePath);
    const { hasExplicitSpaceIdentifier } = getSpaceIdFromPath(
      new URL(baseUrl).pathname,
      serverBasePath
    );
    const kibanaUrl = hasExplicitSpaceIdentifier ? baseUrl : addSpaceIdToPath(baseUrl, spaceId);

    return `${kibanaUrl}${MCP_SERVER_PATH}`;
  }, [http, cloud]);
};
