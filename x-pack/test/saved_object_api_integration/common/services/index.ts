/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as commonServices } from '../../../common/services';
import { services as apiIntegrationServices } from '../../../api_integration/services';
import { services as kibanaApiIntegrationServices } from '../../../../../test/api_integration/services';
import { services as kibanaFunctionalServices } from '../../../../../test/functional/services';

export const services = {
  ...commonServices,
  esSupertestWithoutAuth: apiIntegrationServices.esSupertestWithoutAuth,
  supertest: kibanaApiIntegrationServices.supertest,
  supertestWithoutAuth: apiIntegrationServices.supertestWithoutAuth,
  retry: kibanaApiIntegrationServices.retry,
  esArchiver: kibanaFunctionalServices.esArchiver,
  kibanaServer: kibanaFunctionalServices.kibanaServer,
};
