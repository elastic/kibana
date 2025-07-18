/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as platformServices } from '@kbn/test-suites-xpack-platform/api_integration/services';
import { InfraLogViewsServiceProvider } from './infra_log_views';
import { SloApiProvider } from './slo';

export const services = {
  ...platformServices,
  infraLogViews: InfraLogViewsServiceProvider,
  sloApi: SloApiProvider,
};
