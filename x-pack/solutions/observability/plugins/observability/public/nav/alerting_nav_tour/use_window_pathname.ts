/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

/**
 * Tracks `window.location.pathname` across Kibana navigations.
 *
 * Core does not expose a public location observable for plugins mounted outside
 * an app's ScopedHistory. Kibana in-app navigations often use history.pushState
 * without firing `popstate`, so we patch push/replace (same approach as
 * observability AI Assistant nav context) and restore on unmount.
 */
export const useWindowPathname = (): string => {
  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : ''
  );

  useEffect(() => {
    let unmounted = false;

    const syncPathname = () => {
      if (!unmounted) {
        setPathname(window.location.pathname);
      }
    };

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = (...args: Parameters<History['pushState']>) => {
      originalPushState(...args);
      syncPathname();
    };
    window.history.replaceState = (...args: Parameters<History['replaceState']>) => {
      originalReplaceState(...args);
      syncPathname();
    };

    window.addEventListener('popstate', syncPathname);
    window.addEventListener('hashchange', syncPathname);

    return () => {
      unmounted = true;
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', syncPathname);
      window.removeEventListener('hashchange', syncPathname);
    };
  }, []);

  return pathname;
};
