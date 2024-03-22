/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenericFtrProviderContext } from '@kbn/test';
import { services as xpackFunctionalServices } from '../../functional/services';
import { services as xpackApiIntegrationServices } from '../../api_integration/services';
import { pageObjects } from '../../functional/page_objects';
import { cloudSecurityPosturePageObjects } from '../csp_package_functional/page_objects';

type CSPPageObjects = typeof pageObjects & typeof cloudSecurityPosturePageObjects;

export type ApiIntegrationFtrProviderContext = GenericFtrProviderContext<
  typeof xpackApiIntegrationServices,
  {}
>;

export type FunctionalFtrProviderContext = GenericFtrProviderContext<
  typeof xpackFunctionalServices,
  CSPPageObjects
>;
