/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenericFtrProviderContext } from '@kbn/test';
import { services } from '../../api_integration/services';
import { CustomApiTestServices } from './config';

export type { FtrProviderContext } from '../../api_integration/ftr_provider_context';
export type ObsFtrProviderContext = GenericFtrProviderContext<
  typeof services & CustomApiTestServices,
  {}
>;
