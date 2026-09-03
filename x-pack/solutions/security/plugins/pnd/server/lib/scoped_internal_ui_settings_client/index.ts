/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IUiSettingsClient,
  SavedObjectsServiceStart,
  UiSettingsServiceStart,
} from '@kbn/core/server';

/**
 * Build a space-scoped uiSettings client backed by the Kibana **internal** user.
 *
 * `getUnsafeInternalClient()` returns a saved-objects client that runs as the
 * internal (system) user AND carries the spaces extension, so
 * `asScopedToNamespace(spaceId)` genuinely isolates reads/writes to that space.
 * Because it is the internal user, the resulting uiSettings write bypasses
 * core's `manage_advanced_settings` requirement — the route's own privilege
 * checks (not any SO-level authz) are the sole control.
 *
 * ⚠️ Do NOT substitute `createInternalRepository().asScopedToNamespace(spaceId)`
 * here: that repository has no spaces extension, so `asScopedToNamespace`
 * silently falls back to the default namespace and every space shares one value.
 *
 * The internal client bypasses user-based security, so callers MUST have already
 * authorized the request and allow-listed the target key before writing.
 */
export const getScopedInternalUiSettingsClient = ({
  savedObjects,
  spaceId,
  uiSettings,
}: {
  savedObjects: SavedObjectsServiceStart;
  spaceId: string;
  uiSettings: UiSettingsServiceStart;
}): IUiSettingsClient => {
  const soClient = savedObjects.getUnsafeInternalClient().asScopedToNamespace(spaceId);

  return uiSettings.asScopedToClient(soClient);
};
