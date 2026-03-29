/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { AppServices } from './types';

export const ServicesContext = createContext<AppServices | null>(null);

export const useAppServices = (): AppServices => {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('useAppServices must be used within ServicesContext.Provider');
  }
  return services;
};
