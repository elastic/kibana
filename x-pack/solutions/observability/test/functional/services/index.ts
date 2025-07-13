/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as platformServices } from '@kbn/test-suites-xpack-platform/functional/services';
import { services as obltApiServices } from '../../api_integration/services';
import { SloUiServiceProvider } from './slo';
import { UptimeProvider } from './uptime';

export const services = {
  ...platformServices,
  ...obltApiServices,
  sloUi: SloUiServiceProvider,
  uptime: UptimeProvider,
};
