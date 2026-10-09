/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

/** Returns whether an element matching `selector` is currently in the DOM. */
export const useIsAnchorMounted = (selector: string): boolean => {
  const [isMounted, setIsMounted] = useState<boolean>(
    () => typeof document !== 'undefined' && !!document.querySelector(selector)
  );

  useEffect(() => {
    const check = () => setIsMounted(!!document.querySelector(selector));
    check();

    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [selector]);

  return isMounted;
};
