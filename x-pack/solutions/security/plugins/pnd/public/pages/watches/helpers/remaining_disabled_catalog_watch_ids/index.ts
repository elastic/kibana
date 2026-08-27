/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_CATALOG } from '@kbn/pnd-common';

const CATALOG_IDS = SYSTEM_SECURITY_WATCH_CATALOG.map(({ id }) => id);

const isCatalogWatchId = (watchId: string): boolean =>
  CATALOG_IDS.some((catalogId) => catalogId === watchId);

/**
 * Catalog watch ids still off in this space after the caller just enabled `justEnabledId`.
 *
 * Detection, auto-approver, and custom watches are never offered: they are not in
 * {@link SYSTEM_SECURITY_WATCH_CATALOG}. A catalog id missing from `watches` is treated as off
 * (uninstalled placeholder).
 */
export const remainingDisabledCatalogWatchIds = ({
  justEnabledId,
  watches,
}: {
  justEnabledId: string;
  watches: ReadonlyArray<{ enabled: boolean; id: string }>;
}): readonly string[] => {
  if (!isCatalogWatchId(justEnabledId)) {
    return [];
  }

  const enabledById = new Map(watches.map(({ enabled, id }) => [id, enabled]));

  return CATALOG_IDS.filter((id) => id !== justEnabledId && enabledById.get(id) !== true);
};
