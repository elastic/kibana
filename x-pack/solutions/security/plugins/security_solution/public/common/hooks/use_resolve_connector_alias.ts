/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../lib/kibana';

interface UseResolveConnectorAliasParams {
  /** The connector id to resolve, for example a stack `.inference` connector id. */
  connectorId: string | undefined;
  /** The lookup only runs when this is true and `connectorId` is set. */
  enabled: boolean;
}

interface UseResolveConnectorAliasResult {
  /** The id the connector resolves to, for example the inference endpoint id behind an alias. */
  resolvedConnectorId: string | undefined;
  isResolving: boolean;
}

/**
 * Resolves a connector id on the server, which maps a stack `.inference` connector id to the id of
 * the inference endpoint behind it. A failed lookup, for example for a deleted connector,
 * leaves `resolvedConnectorId` undefined without reporting an error.
 */
export const useResolveConnectorAlias = ({
  connectorId,
  enabled,
}: UseResolveConnectorAliasParams): UseResolveConnectorAliasResult => {
  const { http } = useKibana().services;

  const { data, isFetching } = useQuery({
    queryKey: ['security-solution', 'resolve-connector-alias', connectorId],
    queryFn: async () => {
      const { connector } = await http.get<{ connector: { connectorId: string } }>(
        `/internal/inference/connectors/${encodeURIComponent(connectorId ?? '')}`
      );
      return connector.connectorId;
    },
    enabled: enabled && !!connectorId,
    retry: false,
  });

  return { resolvedConnectorId: data, isResolving: isFetching };
};
