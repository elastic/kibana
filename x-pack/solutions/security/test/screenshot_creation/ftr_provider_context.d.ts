/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenericFtrProviderContext } from '@kbn/test';

import { pageObjects } from '@kbn/test-suites-xpack-platform/screenshot_creation/page_objects';
import { services as platformServices } from '@kbn/test-suites-xpack-platform/screenshot_creation/services';

export const services = {
  ...platformServices,
};

export type FtrProviderContext = GenericFtrProviderContext<typeof services, typeof pageObjects>;
