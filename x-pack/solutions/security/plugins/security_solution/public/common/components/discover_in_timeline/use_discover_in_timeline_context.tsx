/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { DiscoverInTimelineContext } from './context';

export const useDiscoverInTimelineContext = () => {
  const discoverContext = useContext(DiscoverInTimelineContext);
  if (!discoverContext) {
    const errMessage = `useDiscoverInTimelineContext should only used within a tree with parent as DiscoverInTimelineContextProvider`;
    throw new Error(errMessage);
  }

  return discoverContext;
};
