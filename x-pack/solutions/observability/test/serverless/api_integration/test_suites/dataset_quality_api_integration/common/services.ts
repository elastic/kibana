/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { GenericFtrProviderContext } from '@kbn/test';
import type { DatasetQualityApiClient } from './dataset_quality_api_supertest';
import { getDatasetQualityApiClientService } from './dataset_quality_api_supertest';
import type { InheritedServices, InheritedFtrProviderContext } from '../../../services';
import { services as inheritedServices } from '../../../services';

export type DatasetQualityServices = InheritedServices & {
  datasetQualityApiClient: (
    context: InheritedFtrProviderContext
  ) => Promise<DatasetQualityApiClient>;
  logsSynthtraceEsClient: (context: InheritedFtrProviderContext) => Promise<LogsSynthtraceEsClient>;
};

export const services: DatasetQualityServices = {
  ...inheritedServices,
  datasetQualityApiClient: getDatasetQualityApiClientService,
  logsSynthtraceEsClient: async (context: InheritedFtrProviderContext) => {
    const synthtraceClient = context.getService('synthtrace');
    const { logsEsClient } = synthtraceClient.getClients(['logsEsClient']);

    return logsEsClient;
  },
};

export type DatasetQualityFtrContextProvider = GenericFtrProviderContext<typeof services, {}>;
