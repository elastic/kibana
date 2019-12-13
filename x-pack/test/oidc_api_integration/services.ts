/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { services as commonServices } from '../common/services';
import { services as apiIntegrationServices } from '../api_integration/services';

export const services = {
  ...commonServices,
  legacyEs: apiIntegrationServices.legacyEs,
  supertestWithoutAuth: apiIntegrationServices.supertestWithoutAuth,
};
