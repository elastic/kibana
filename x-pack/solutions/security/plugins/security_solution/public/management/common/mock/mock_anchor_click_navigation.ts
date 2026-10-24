/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';

/**
 * Minimal test-only replica of Core's global same-origin `<a>` click interception
 * (`GlobalRedirectAppLink`, mounted once in `rendering_service.tsx` — outside any plugin's
 * React tree, so it isn't part of `createAppRootMockRenderer`'s harness). `AppHeader` tabs
 * navigate via a plain `href` with no `onClick`/`preventDefault` (by `@kbn/app-header`
 * design: "an `onClick` that navigates to the same URL is unnecessary" because Kibana
 * handles same-origin hrefs as SPA navigation). Without this, clicking such a link in
 * jsdom is a no-op and the mocked `history` never updates.
 *
 * Call in `beforeEach` with the renderer's `coreStart`, and call the returned cleanup in
 * `afterEach`.
 */
export const mockAnchorClickNavigation = (coreStart: CoreStart): (() => void) => {
  const handleClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }
    if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }

    const anchor = (event.target as HTMLElement | null)?.closest('a');
    // Raw attribute, not the resolved `.href` property: the mocked `navigateToUrl`
    // (`app_context_render.tsx`) expects the same relative/app-rooted path that
    // `getAppUrl()` produced, not an absolute `http://localhost/...` URL.
    const href = anchor?.getAttribute('href');
    if (!anchor || !href || (anchor.target && anchor.target !== '_self')) {
      return;
    }

    event.preventDefault();
    coreStart.application.navigateToUrl(href);
  };

  document.body.addEventListener('click', handleClick);

  return () => document.body.removeEventListener('click', handleClick);
};
