/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaSupertestWithCertProvider,
  KibanaSupertestWithCertWithoutAuthProvider,
} from '../../../security_solution_endpoint/services/supertest_with_cert';
import { services as essServices } from '../ess/services_edr_workflows';

export const svlServices = {
  ...essServices,

  supertest: KibanaSupertestWithCertProvider,
  supertestWithoutAuth: KibanaSupertestWithCertWithoutAuthProvider,
};
