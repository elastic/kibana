/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore not ts yet
import { EsProvider } from './es';

import { services as apiIntegrationServices } from '../../../api_integration/services';
import { services as kibanaApiIntegrationServices } from '../../../../../test/api_integration/services';
import { services as kibanaFunctionalServices } from '../../../../../test/functional/services';

export const services = {
  es: EsProvider,
  esSupertestWithoutAuth: apiIntegrationServices.esSupertestWithoutAuth,
  supertest: kibanaApiIntegrationServices.supertest,
  supertestWithoutAuth: apiIntegrationServices.supertestWithoutAuth,
  esArchiver: kibanaFunctionalServices.esArchiver,
  kibanaServer: kibanaFunctionalServices.kibanaServer,
};
