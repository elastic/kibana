/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useContext } from 'react';

export type MainFlyoutSession = 'start' | 'inherit';

const DEFAULT_FLYOUT_SESSION: MainFlyoutSession = 'start';

const FlyoutSessionContext = createContext<MainFlyoutSession>(DEFAULT_FLYOUT_SESSION);

export const FlyoutSessionContextProvider: FC<PropsWithChildren<{ value: MainFlyoutSession }>> = ({
  value,
  children,
}) => <FlyoutSessionContext.Provider value={value}>{children}</FlyoutSessionContext.Provider>;

export const useFlyoutSessionContext = (): MainFlyoutSession => useContext(FlyoutSessionContext);
