/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenericFtrProviderContext, GenericFtrService } from '@kbn/test';

import { pageObjects as platformPageObjects } from '@kbn/test-suites-xpack-platform/functional_with_es_ssl/page_objects';
import { services } from '../functional/services';
import { UptimePageObject } from '../functional/page_objects/uptime_page';

export const pageObjects = {
  ...platformPageObjects,
  uptime: UptimePageObject,
};

export type FtrProviderContext = GenericFtrProviderContext<typeof services, typeof pageObjects>;
export class FtrService extends GenericFtrService<FtrProviderContext> {}
