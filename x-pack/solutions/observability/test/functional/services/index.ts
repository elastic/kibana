/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as platformFunctionalServices } from '@kbn/test-suites-xpack-platform/functional/services';
import { services as obltApiIntegrationServices } from '../../api_integration/services';
import { ObservabilityProvider } from './observability';

export const services = {
  ...platformFunctionalServices,
  ...obltApiIntegrationServices,
  observability: ObservabilityProvider,
};
