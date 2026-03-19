/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';
import { versionStore } from './version_switcher_store';
import type { IngestHubVersion } from './version_switcher_store';

export { versionStore } from './version_switcher_store';
export type { IngestHubVersion } from './version_switcher_store';

export const useActiveVersion = (): [IngestHubVersion, (v: IngestHubVersion) => void] => {
  const version = useSyncExternalStore(versionStore.subscribe, versionStore.getSnapshot);
  return [version, versionStore.setVersion];
};
