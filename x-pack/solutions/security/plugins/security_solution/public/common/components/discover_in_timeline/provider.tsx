/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtendedDiscoverStateContainer } from '@kbn/discover-plugin/public';
import type { History } from 'history';
import type { PropsWithChildren, FC } from 'react';
import React, { useCallback, useRef } from 'react';
import { DiscoverInTimelineContext } from './context';
import { useDiscoverInTimelineActions } from './use_discover_in_timeline_actions';

type DiscoverInTimelineContextProviderProps = PropsWithChildren<{
  /* The history the timeline's ES|QL tab syncs its Discover state with */
  history?: History;
}>;

export const DiscoverInTimelineContextProvider: FC<DiscoverInTimelineContextProviderProps> = (
  props
) => {
  const discoverStateContainer = useRef<ExtendedDiscoverStateContainer>();

  const actions = useDiscoverInTimelineActions(discoverStateContainer, props.history);

  const setDiscoverStateContainer = useCallback(
    (stateContainer: ExtendedDiscoverStateContainer | undefined) => {
      discoverStateContainer.current = stateContainer;
    },
    []
  );

  return (
    <DiscoverInTimelineContext.Provider
      value={{
        discoverStateContainer,
        setDiscoverStateContainer,
        ...actions,
      }}
    >
      {props.children}
    </DiscoverInTimelineContext.Provider>
  );
};
