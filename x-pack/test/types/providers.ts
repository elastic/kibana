/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsArchiver } from '../../../src/es_archiver';
import { SuperDatePickerProvider } from '../../../test/functional/services/super_date_picker';
import { UptimeProvider } from '../functional/services/uptime';


export interface KibanaFunctionalTestDefaultProviders {
  getService(serviceName: 'esArchiver'): EsArchiver;
  getService(serviceName: 'superDatePicker'): ReturnType<typeof SuperDatePickerProvider>;
  getService(serviceName: 'uptime'): ReturnType<typeof UptimeProvider>;
  getService(serviceName: string): any;
  getPageObjects(pageObjectNames: string[]): any;
  loadTestFile(path: string): void;
}
