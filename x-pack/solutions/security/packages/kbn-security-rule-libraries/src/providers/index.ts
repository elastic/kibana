/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import type { ProviderType } from '../types';
import { FleetProvider } from './fleet_provider';
import { GitProvider } from './git_provider';
import { S3Provider } from './s3_provider';
import type { RuleLibraryProvider } from './types';

export interface ProviderFactoryDeps {
  logger: Logger;
  packages: PackageClient;
}

export const createProvider = (
  type: ProviderType,
  { logger, packages }: ProviderFactoryDeps
): RuleLibraryProvider => {
  switch (type) {
    case 'fleet':
      return new FleetProvider({ packages, logger });
    case 'git':
      return new GitProvider({ logger });
    case 's3':
      return new S3Provider({ logger });
  }
};

export type { RuleLibraryProvider, ItemBatch, ProviderDeps } from './types';
export { FleetProvider } from './fleet_provider';
export { GitProvider } from './git_provider';
export { S3Provider } from './s3_provider';
