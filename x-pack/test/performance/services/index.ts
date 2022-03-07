/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as functionalServices } from '../../functional/services';
import { PerformanceTestingService } from './performance';
import { InputDelaysProvider } from './input_delays';

export const services = {
  es: functionalServices.es,
  kibanaServer: functionalServices.kibanaServer,
  esArchiver: functionalServices.esArchiver,
  retry: functionalServices.retry,
  performance: PerformanceTestingService,
  inputDelays: InputDelaysProvider,
};
