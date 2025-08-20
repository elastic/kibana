/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext } from 'react';
import type { CloudSetupConfig } from './types';

interface CloudSetupContextValue {
  config: CloudSetupConfig;
}

export const CloudSetupContext = createContext<CloudSetupContextValue | undefined>(undefined);

export const CloudSetupProvider = ({
  config,
  children,
}: {
  config: CloudSetupConfig;
  children: React.ReactNode;
}) => {
  return <CloudSetupContext.Provider value={{ config }}>{children}</CloudSetupContext.Provider>;
};
