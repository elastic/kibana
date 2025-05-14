/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityEngineInstallationDescriptor } from '../installation/types';

type PickPartial<T, K extends keyof T, Optional extends K = never> = {
  [P in K as P extends Optional ? never : P]: T[P];
} & {
  [P in K as P extends Optional ? P : never]?: Partial<T[P]>;
};

export type EntityDescription = PickPartial<
  EntityEngineInstallationDescriptor,
  | 'version'
  | 'entityType'
  | 'fields'
  | 'identityField'
  | 'indexPatterns'
  | 'indexMappings'
  | 'settings'
  | 'pipeline'
  | 'dynamic',
  'indexPatterns' | 'indexMappings' | 'settings' | 'dynamic'
>;
