/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericFtrProviderContext } from '@kbn/test';
import type { services } from '@kbn/test-suites-xpack-platform/functional/services';
import type { pageObjects } from '@kbn/test-suites-xpack-platform/functional/page_objects';

export type FtrProviderContext = GenericFtrProviderContext<typeof services, typeof pageObjects>;
