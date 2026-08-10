/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { getSpaceIdFromPath, addSpaceIdToPath } from '@kbn/core-spaces-common';
import { useKibana } from './use_kibana';
import { useSpaceId } from './use_space_id';

export const useKibanaUrl = () => {
  const {
    services: { cloud, http },
  } = useKibana();
  const spaceId = useSpaceId();

  const kibanaUrl = useMemo(() => {
    const baseUrl = http.basePath.publicBaseUrl ?? cloud?.kibanaUrl ?? getFallbackKibanaUrl(http);

    const pathname = new URL(baseUrl).pathname;
    const serverBasePath = http.basePath.serverBasePath;
    const { hasExplicitSpaceIdentifier } = getSpaceIdFromPath(pathname, serverBasePath);

    if (!hasExplicitSpaceIdentifier) {
      return addSpaceIdToPath(baseUrl, spaceId);
    }

    return baseUrl;
  }, [cloud, http, spaceId]);

  return { kibanaUrl };
};

export function getFallbackKibanaUrl(http: HttpSetup) {
  return `${window.location.origin}${http.basePath.get()}`;
}
