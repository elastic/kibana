/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, PropsWithChildren } from 'react';
import { ClientPluginsStart } from '../../plugin';

export const UptimeStartupPluginsContext = createContext<Partial<ClientPluginsStart>>({});

export const UptimeStartupPluginsContextProvider: React.FC<
  PropsWithChildren<Partial<ClientPluginsStart>>
> = ({ children, ...props }) => (
  <UptimeStartupPluginsContext.Provider value={{ ...props }} children={children} />
);

export const useUptimeStartPlugins = () => useContext(UptimeStartupPluginsContext);
