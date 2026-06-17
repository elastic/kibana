/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import type { Space } from '@kbn/spaces-plugin/common';
import { API_VERSIONS } from '@kbn/spaces-plugin/common';
import type { ClientPluginsStart } from '../plugin';

export const useHasMultipleSpaces = () => {
  const { services } = useKibana<ClientPluginsStart>();
  const { spaces, http } = services;

  const { data, loading } = useFetcher(async () => {
    // When the Spaces plugin is disabled or the instance only supports the
    // default space there is nothing to switch between, so skip the request.
    if (!spaces || spaces.hasOnlyDefaultSpace) {
      return [] as Space[];
    }
    return http?.get<Space[]>('/api/spaces/space', { version: API_VERSIONS.public.v1 });
  }, [spaces, http]);

  return {
    hasMultipleSpaces: (data?.length ?? 0) > 1,
    loading,
  };
};
