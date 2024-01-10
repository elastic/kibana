/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GenericFtrProviderContext } from '@kbn/test';

import { SpacesServiceProvider } from '../common/services/spaces';
import { services as serverlessServices } from '../../test_serverless/api_integration/services';

const services = {
  ...serverlessServices,
  spaces: SpacesServiceProvider,
};
export type FtrProviderContextWithSpaces = GenericFtrProviderContext<typeof services, {}>;
