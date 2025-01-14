/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type GenericFtrProviderContext } from '@kbn/test';
import { type ApmApiClient, getApmApiClientService } from './apm_api_supertest';
import {
  type InheritedServices,
  type InheritedFtrProviderContext,
  services as inheritedServices,
} from '../../../../services';

export type APMServices = InheritedServices & {
  apmApiClient: (context: InheritedFtrProviderContext) => Promise<ApmApiClient>;
};

export const services: APMServices = {
  ...inheritedServices,
  apmApiClient: getApmApiClientService,
};

export type APMFtrContextProvider = GenericFtrProviderContext<typeof services, {}>;
