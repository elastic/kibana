/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import throttle from 'lodash/throttle';
import { useEffect, useState } from 'react';

export const useCurrentWindowWidth = () => {
  const [currentWidth, setCurrentWidth] = useState<number>(() => window.innerWidth);

  useEffect(() => {
    const handleWindowResize = throttle(
      () => {
        setCurrentWidth(window.innerWidth);
      },
      250,
      { leading: false }
    );

    window.addEventListener('resize', handleWindowResize);

    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  return currentWidth;
};
