/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericFtrProviderContext } from '@kbn/test';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- `extends` needs the value
import { GenericFtrService } from '@kbn/test';

import type { pageObjects } from './page_objects';
import type { services } from './services';

export type FtrProviderContext = GenericFtrProviderContext<typeof services, typeof pageObjects>;
export class FtrService extends GenericFtrService<FtrProviderContext> {}
