/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as kibanaApiIntegrationServices } from '../../../../test/api_integration/services';
import { services as kibanaCommonServices } from '../../../../test/common/services';
import { InfraLogViewsServiceProvider } from './infra_log_views';
import { SpacesServiceProvider } from './spaces';
import { BSecureSearchProvider } from './bsearch_secure';

export const services = {
  ...kibanaCommonServices,
  infraLogViews: InfraLogViewsServiceProvider,
  supertest: kibanaApiIntegrationServices.supertest,
  spaces: SpacesServiceProvider,
  secureBsearch: BSecureSearchProvider,
};
