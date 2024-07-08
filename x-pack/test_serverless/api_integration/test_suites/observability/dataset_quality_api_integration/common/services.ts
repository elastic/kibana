/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLogger, LogLevel, LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { GenericFtrProviderContext } from '@kbn/test';
import {
  DatasetQualityApiClient,
  getDatasetQualityApiClientService,
} from './dataset_quality_api_supertest';
import {
  InheritedServices,
  InheritedFtrProviderContext,
  services as inheritedServices,
} from '../../../../services';

export type DatasetQualityServices = InheritedServices & {
  datasetQualityApiClient: (
    context: InheritedFtrProviderContext
  ) => Promise<DatasetQualityApiClient>;
  logSynthtraceEsClient: (context: InheritedFtrProviderContext) => Promise<LogsSynthtraceEsClient>;
};

export const services: DatasetQualityServices = {
  ...inheritedServices,
  datasetQualityApiClient: getDatasetQualityApiClientService,
  logSynthtraceEsClient: async (context: InheritedFtrProviderContext) =>
    new LogsSynthtraceEsClient({
      client: context.getService('es'),
      logger: createLogger(LogLevel.info),
      refreshAfterIndex: true,
    }),
};

export type DatasetQualityFtrContextProvider = GenericFtrProviderContext<typeof services, {}>;
