/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { FormSettings } from '../types';

const DEFAULT_FORM_SETTINGS: Required<FormSettings> = {
  isEditMode: false,
  isFlyout: false,
  allowedIndicatorTypes: [],
};

const SloFormContext = createContext<Required<FormSettings>>(DEFAULT_FORM_SETTINGS);

export function SloFormContextProvider({
  children,
  value,
}: {
  children: ReactNode;
  value?: FormSettings;
}) {
  return (
    <SloFormContext.Provider value={{ ...DEFAULT_FORM_SETTINGS, ...value }}>
      {children}
    </SloFormContext.Provider>
  );
}

export function useSloFormContext() {
  return useContext(SloFormContext);
}
