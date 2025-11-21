/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { getSpaceIdFromPath, addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { MCP_SERVER_PATH } from '../../../common';
import { useKibana } from './use_kibana';
import { useSpaceId } from './use_space_id';

export const useMcpServerUrl = () => {
  const {
    services: { http, plugins },
  } = useKibana();
  const spaceId = useSpaceId(plugins.spaces);

  const mcpServerUrl = useMemo(() => {
    // Get the base URL, preferring publicBaseUrl, then cloud URL, then window location
    const baseUrl =
      http.basePath.publicBaseUrl ?? plugins.cloud?.kibanaUrl ?? getFallbackKibanaUrl(http);

    const pathname = new URL(baseUrl).pathname;
    const serverBasePath = http.basePath.serverBasePath;
    const { pathHasExplicitSpaceIdentifier } = getSpaceIdFromPath(pathname, serverBasePath);

    // Add space ID to the base URL if it doesn't already have one
    const kibanaUrl = !pathHasExplicitSpaceIdentifier
      ? addSpaceIdToPath(baseUrl, spaceId)
      : baseUrl;

    return `${kibanaUrl}${MCP_SERVER_PATH}`;
  }, [http, plugins.cloud, spaceId]);

  return { mcpServerUrl };
};

export function getFallbackKibanaUrl(http: HttpSetup) {
  return `${window.location.origin}${http.basePath.get()}`;
}
