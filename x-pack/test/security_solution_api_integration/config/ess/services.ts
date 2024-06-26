/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpacesServiceProvider } from '../../../common/services/spaces';
import { services as essServices } from '../../../api_integration/services';
import { SecuritySolutionESSUtils } from '../services/security_solution_ess_utils';

export const services = {
  ...essServices,
  spaces: SpacesServiceProvider,
  securitySolutionUtils: SecuritySolutionESSUtils,
};
