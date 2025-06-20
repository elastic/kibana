/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useDarkMode } from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider as KibanaEuiThemeProvider } from '@kbn/kibana-react-plugin/common';

export const EuiThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const darkMode = useDarkMode();

  return <KibanaEuiThemeProvider darkMode={darkMode}>{children}</KibanaEuiThemeProvider>;
};
