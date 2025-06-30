/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as xpackPlatformServices } from '@kbn/test-suites-xpack/functional/services';
import { InfraSourceConfigurationFormProvider } from './infra_source_configuration_form';
import { LogsUiProvider } from './logs_ui';
import { UptimeProvider } from './uptime';
import { ObservabilityProvider } from './observability';
import { ApmSynthtraceKibanaClientProvider } from '../../api_integration/services/apm_synthtrace_kibana_client';

export const services = {
  ...xpackPlatformServices,
  apmSynthtraceKibanaClient: ApmSynthtraceKibanaClientProvider,
  observability: ObservabilityProvider,
  infraSourceConfigurationForm: InfraSourceConfigurationFormProvider,
  logsUi: LogsUiProvider,
  uptime: UptimeProvider,
};
