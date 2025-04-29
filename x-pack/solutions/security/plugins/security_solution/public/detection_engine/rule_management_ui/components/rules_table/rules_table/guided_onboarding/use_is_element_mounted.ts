/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

export const useIsElementMounted = (elementId: string) => {
  const [isElementMounted, setIsElementMounted] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isElementFound = !!document.getElementById(elementId);

      if (isElementFound && !isElementMounted) {
        setIsElementMounted(true);
      }

      if (!isElementFound && isElementMounted) {
        setIsElementMounted(false);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [isElementMounted, elementId]);

  return isElementMounted;
};
