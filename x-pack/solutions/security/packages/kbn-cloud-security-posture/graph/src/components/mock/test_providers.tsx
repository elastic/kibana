/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';

interface Props {
  children?: React.ReactNode;
}

export const TestProvidersComponent = ({ children }: Props) => {
  return <EuiThemeProvider colorMode="dark">{children}</EuiThemeProvider>;
};

export const TestProviders = React.memo(TestProvidersComponent);
