/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericFtrProviderContext } from '@kbn/test';

import type { pageObjects } from '../functional/page_objects';
import type { services } from '../functional/services';
import type { TestConfig } from './common/config';

export type InheritedServices = typeof services;

export type InheritedFtrProviderContext = GenericFtrProviderContext<
  InheritedServices,
  typeof pageObjects
>;

export type FtrProviderContext = GenericFtrProviderContext<
  TestConfig['services'],
  typeof pageObjects
>;
