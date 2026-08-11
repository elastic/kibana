/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Read the `showFromAllSpaces` preference from `localStorage` **synchronously**
 * so that the Redux initial state matches what `<ShowAllSpaces>` will
 * eventually dispatch once the async space API resolves.
 *
 * Without this, the initial `pageState` carries `showFromAllSpaces: false`
 * (the hardcoded default) while `localStorage` may hold `true`. When
 * `<ShowAllSpaces>` finally mounts and dispatches the real value, the
 * `useDebounce` in `useOverviewStatus` / `useMonitorList` sees a genuine
 * content change (`false → true`) and fires a second fetch — the duplicate
 * request the user sees in DevTools.
 *
 * The `<SelectablePopover>` component stores the value under the key
 * `'SyntheticsShowFromAllSpaces' + space.id` via `react-use/useLocalStorage`.
 * We derive the space ID from the current URL path:
 *   - Non-default space: `…/s/{spaceId}/app/synthetics/…`
 *   - Default space:     `…/app/synthetics/…`  (no `/s/` segment)
 */
export function getInitialShowFromAllSpaces(): boolean {
  try {
    const match = window.location.pathname.match(/\/s\/([^/]+)\//);
    const spaceId = match ? match[1] : 'default';
    const raw = localStorage.getItem('SyntheticsShowFromAllSpaces' + spaceId);
    return raw ? JSON.parse(raw) === true : false;
  } catch {
    return false;
  }
}
