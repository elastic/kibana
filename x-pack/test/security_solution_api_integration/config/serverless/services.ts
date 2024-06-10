/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpacesServiceProvider } from '../../../common/services/spaces';
import { BsearchSecureService } from '../../../../test_serverless/shared/services/bsearch_secure';
import { services as serverlessServices } from '../../../../test_serverless/api_integration/services';
import { SecuritySolutionServerlessSuperTest } from './security_supertests';

export const services = {
  ...serverlessServices,
  spaces: SpacesServiceProvider,
  secureBsearch: BsearchSecureService,
  supertest: SecuritySolutionServerlessSuperTest,
};
