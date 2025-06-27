/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren } from 'react';
import { fallbackDataViews } from './constants';
import { DefaultDataViewContext } from './context';

export const TestDefaultDataViewProvider: FC<PropsWithChildren> = ({ children }) => (
  <DefaultDataViewContext.Provider value={fallbackDataViews}>
    {children}
  </DefaultDataViewContext.Provider>
);
