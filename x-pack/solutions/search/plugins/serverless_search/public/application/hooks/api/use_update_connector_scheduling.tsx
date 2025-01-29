/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */ /*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SchedulingConfiguraton } from '@kbn/search-connectors';
import { useMutation } from '@tanstack/react-query';
import { useKibanaServices } from '../use_kibana';

export const useConnectorScheduling = (connectorId: string) => {
  const { http } = useKibanaServices();
  return useMutation({
    mutationFn: async (configuration: SchedulingConfiguraton) => {
      return await http.post(`/internal/serverless_search/connectors/${connectorId}/scheduling`, {
        body: JSON.stringify({ ...configuration }),
      });
    },
  });
};
