/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsArchiver } from '../../../src/es_archiver';
import { InfraLogStreamProvider } from '../functional/services/infra_log_stream';
import { InfraSourceConfigurationFlyoutProvider } from '../functional/services/infra_source_configuration_flyout';
import { UptimeProvider } from '../functional/services/uptime';

export interface KibanaFunctionalTestDefaultProviders {
  getService(serviceName: 'esArchiver'): EsArchiver;
  getService(serviceName: 'infraLogStream'): ReturnType<typeof InfraLogStreamProvider>;
  getService(
    serviceName: 'infraSourceConfigurationFlyout'
  ): ReturnType<typeof InfraSourceConfigurationFlyoutProvider>;
  getService(serviceName: 'uptime'): ReturnType<typeof UptimeProvider>;
  getService(serviceName: string): any;
  getPageObjects(pageObjectNames: string[]): any;
  loadTestFile(path: string): void;
  readConfigFile(path: string): any;
}
