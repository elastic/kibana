/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INCLUDE_HEARTBEAT_MONITORS_KEY = 'SyntheticsIncludeHeartbeatMonitors';

/**
 * Read the `includeHeartbeatMonitors` preference from `localStorage`
 * **synchronously** so the Redux initial `pageState` matches what
 * `<ShowHeartbeatMonitorsToggle>` will dispatch on mount. Without this, the
 * first fetch runs with the hardcoded default and a second fetch fires once the
 * toggle mounts with the stored value (the duplicate-request problem documented
 * in `get_initial_show_from_all_spaces.ts`).
 *
 * Defaults to `true` (show them) — the feature's purpose is to surface these
 * otherwise-invisible monitors; users opt out explicitly.
 */
export function getInitialIncludeHeartbeatMonitors(): boolean {
  try {
    const match = window.location.pathname.match(/\/s\/([^/]+)\//);
    const spaceId = match ? match[1] : 'default';
    const raw = localStorage.getItem(INCLUDE_HEARTBEAT_MONITORS_KEY + spaceId);
    return raw ? JSON.parse(raw) !== false : true;
  } catch {
    return true;
  }
}
