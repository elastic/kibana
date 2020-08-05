/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GenericFtrProviderContext } from '@kbn/test/types/ftr';
import { pageObjects } from '../functional/page_objects';
import { services } from './services';

export type FtrProviderContext = GenericFtrProviderContext<typeof services, typeof pageObjects>;
export { pageObjects };
