/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../hooks/use_kibana';

const cortexKeys = {
  availability: ['cortex', 'availability'] as const,
  pages: ['cortex', 'pages'] as const,
  page: (id: string) => ['cortex', 'page', id] as const,
};

/**
 * Typed client for the Nightshift routes, or undefined when the plugin is not installed. Every
 * query below stays disabled in that case.
 */
const useCortexClient = () => {
  const {
    dependencies: {
      start: { nightshiftInvestigations },
    },
  } = useKibana();

  return nightshiftInvestigations?.investigationsClient;
};

/**
 * Reports whether Cortex is usable: the Nightshift plugin has to be installed, and
 * `xpack.nightshift_investigations.cortex.enabled` has to be on.
 */
export const useCortexEnabled = (): boolean => {
  const client = useCortexClient();

  const { data } = useQuery({
    queryKey: cortexKeys.availability,
    queryFn: ({ signal }) =>
      client!.fetch('GET /internal/nightshift/cortex/availability', { signal: signal ?? null }),
    enabled: client !== undefined,
    retry: false,
  });

  return data?.enabled ?? false;
};

export const useCortexPages = () => {
  const client = useCortexClient();

  return useQuery({
    queryKey: cortexKeys.pages,
    queryFn: ({ signal }) =>
      client!.fetch('GET /internal/nightshift/cortex/pages', { signal: signal ?? null }),
    enabled: client !== undefined,
  });
};

export const useCortexPage = (id: string | undefined) => {
  const client = useCortexClient();

  return useQuery({
    queryKey: cortexKeys.page(id ?? ''),
    queryFn: ({ signal }) =>
      client!.fetch('GET /internal/nightshift/cortex/pages/{id}', {
        signal: signal ?? null,
        params: { path: { id: id! } },
      }),
    enabled: id !== undefined && client !== undefined,
  });
};
