/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityOnboardingAppServices } from '../..';

/** Fleet's experimental flag that collapses grouped packages into collection cards. */
const COLLECTION_TILES_FLAG = 'enableIntegrationCollectionTiles';

/**
 * Whether Fleet groups packages into collection cards. Fleet exposes its
 * experimental flags to the browser, so the page can tell in advance that no
 * collection card will arrive and skip asking the registry for packages.
 */
export const useCollectionTilesEnabled = (): boolean => {
  const {
    services: { fleet },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const { enableExperimental, experimentalFeatures } = fleet?.config ?? {};
  const fromObject = experimentalFeatures?.[COLLECTION_TILES_FLAG];
  if (typeof fromObject === 'boolean') {
    return fromObject;
  }

  return enableExperimental?.includes(COLLECTION_TILES_FLAG) ?? false;
};
