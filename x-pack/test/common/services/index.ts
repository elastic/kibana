/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as kibanaApiIntegrationServices } from '@kbn/test-suites-src/api_integration/services';
import { services as kibanaCommonServices } from '@kbn/test-suites-src/common/services';
import { InfraLogViewsServiceProvider } from './infra_log_views';
import { SpacesServiceProvider } from './spaces';
import { BsearchSecureService } from './bsearch_secure';
import { ApmSynthtraceKibanaClientProvider } from './apm_synthtrace_kibana_client';
import { InfraSynthtraceKibanaClientProvider } from './infra_synthtrace_kibana_client';

export const services = {
  ...kibanaCommonServices,
  infraLogViews: InfraLogViewsServiceProvider,
  supertest: kibanaApiIntegrationServices.supertest,
  spaces: SpacesServiceProvider,
  secureBsearch: BsearchSecureService,
  apmSynthtraceKibanaClient: ApmSynthtraceKibanaClientProvider,
  infraSynthtraceKibanaClient: InfraSynthtraceKibanaClientProvider,
};
