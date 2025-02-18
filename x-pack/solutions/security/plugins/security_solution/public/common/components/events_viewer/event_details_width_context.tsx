/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { createContext, useContext } from 'react';
import { useThrottledResizeObserver } from '../utils';

const DEFAULT_WIDTH = 0;

const EventDetailsWidthContext = createContext(DEFAULT_WIDTH);

export const useEventDetailsWidthContext = () => useContext(EventDetailsWidthContext);

export const EventDetailsWidthProvider = React.memo<PropsWithChildren<unknown>>(({ children }) => {
  const { ref, width } = useThrottledResizeObserver();

  return (
    <>
      <EventDetailsWidthContext.Provider value={width ?? DEFAULT_WIDTH}>
        {children}
      </EventDetailsWidthContext.Provider>
      <div ref={ref} />
    </>
  );
});

EventDetailsWidthProvider.displayName = 'EventDetailsWidthProvider';
