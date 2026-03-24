/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import type { HttpSetup } from '@kbn/core/public';
import { useLoadConnectors } from '@kbn/response-ops-rule-form/src/common/hooks';

export const useConnectors = ({ http }: { http: HttpSetup }) => {
  const [currentConnector, setCurrentConnector] = useState<ActionConnector | null>(null);

  const { data: allConnectors, isLoading: isLoadingAllConnectors } = useLoadConnectors({ http });

  const connectors = useMemo(() => {
    if (!isLoadingAllConnectors && allConnectors) {
      if (
        currentConnector &&
        !allConnectors.some((connector) => connector.id === currentConnector.id)
      ) {
        return [...allConnectors, currentConnector];
      }
      return allConnectors;
    }
    return currentConnector ? [currentConnector] : [];
  }, [currentConnector, isLoadingAllConnectors, allConnectors]);

  return { connectors, setCurrentConnector };
};
