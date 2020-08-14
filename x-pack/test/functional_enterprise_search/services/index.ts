/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { services as functionalServices } from '../../functional/services';
import { AppSearchServiceProvider } from './app_search_service';

export const services = {
  ...functionalServices,
  appSearch: AppSearchServiceProvider,
};
