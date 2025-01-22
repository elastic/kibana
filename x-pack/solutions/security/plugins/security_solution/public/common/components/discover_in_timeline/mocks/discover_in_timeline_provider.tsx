/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { discoverPluginMock } from '@kbn/discover-plugin/public/mocks';
import React, { useRef, useCallback } from 'react';
import type { FC, PropsWithChildren } from 'react';
import { DiscoverInTimelineContext } from '../context';
import { useDiscoverInTimelineActions } from '../use_discover_in_timeline_actions';

type Props = PropsWithChildren<{}>;

jest.mock('../use_discover_in_timeline_actions');

export const MockDiscoverInTimelineContext: FC<Props> = ({ children }) => {
  const discoverStateContainer = useRef(discoverPluginMock.getDiscoverStateMock({}));

  const setDiscoverStateContainer = useCallback((stateContainer: DiscoverStateContainer) => {
    discoverStateContainer.current = stateContainer;
  }, []);

  const actions = useDiscoverInTimelineActions(discoverStateContainer);

  return (
    <DiscoverInTimelineContext.Provider
      value={{
        discoverStateContainer,
        setDiscoverStateContainer,
        ...actions,
      }}
    >
      {children}
    </DiscoverInTimelineContext.Provider>
  );
};
