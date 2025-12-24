/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@kbn/react-query';

export const useIntegrationDisplayNames = () => {
  const { http } = useKibana<CoreStart>().services;

  return useQuery({
    queryKey: ['integration-display-names'] as const,
    queryFn: async () => {
      const response = await http.get<{ items: Array<{ name: string; title: string }> }>(
        '/api/fleet/epm/packages'
      );

      // Create a mapping of package name to display title
      const nameToTitleMap = new Map<string, string>();
      response.items?.forEach((pkg) => {
        nameToTitleMap.set(pkg.name, pkg.title || pkg.name);
      });

      return nameToTitleMap;
    },
  });
};
