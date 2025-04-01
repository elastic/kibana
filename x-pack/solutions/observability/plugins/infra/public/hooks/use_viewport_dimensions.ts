/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { throttle } from 'lodash';

interface ViewportDimensions {
  width: number;
  height: number;
}

const getViewportWidth = () =>
  window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
const getViewportHeight = () =>
  window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

export function useViewportDimensions(): ViewportDimensions {
  const [dimensions, setDimensions] = useState<ViewportDimensions>({
    width: getViewportWidth(),
    height: getViewportHeight(),
  });

  useEffect(() => {
    const updateDimensions = throttle(() => {
      setDimensions({
        width: getViewportWidth(),
        height: getViewportHeight(),
      });
    }, 250);

    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return dimensions;
}
