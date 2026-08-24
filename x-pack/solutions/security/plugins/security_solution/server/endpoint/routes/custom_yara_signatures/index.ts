/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerValidateCustomYaraSignatureRoute } from './validate';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { EndpointAppContext } from '../../types';

export const registerCustomYaraSignaturesRoutes = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  if (endpointContext.experimentalFeatures.customYaraSignaturesEnabled) {
    endpointContext.logFactory
      .get('customYaraSignatures')
      .debug('Registering custom YARA signatures routes');

    registerValidateCustomYaraSignatureRoute(router, endpointContext);
  }
};
