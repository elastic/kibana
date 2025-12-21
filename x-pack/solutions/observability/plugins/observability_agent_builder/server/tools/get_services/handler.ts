/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { ServicesItemsItem } from '../../data_registry/data_registry_types';

export async function getToolHandler({
  request,
  dataRegistry,
  start,
  end,
  environment,
  healthStatus,
}: {
  request: KibanaRequest;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  start: string;
  end: string;
  environment?: string;
  healthStatus?: string[];
}): Promise<{
  services: ServicesItemsItem[];
  maxCountExceeded: boolean;
  serviceOverflowCount: number;
}> {
  const response = await dataRegistry.getData('servicesItems', {
    request,
    environment,
    start,
    end,
  });

  const services = (response?.items ?? []).filter((item) => {
    if (!healthStatus) {
      return true;
    }

    return healthStatus.includes(item.healthStatus ?? 'unknown');
  });

  return {
    services,
    maxCountExceeded: response?.maxCountExceeded ?? false,
    serviceOverflowCount: response?.serviceOverflowCount ?? 0,
  };
}
