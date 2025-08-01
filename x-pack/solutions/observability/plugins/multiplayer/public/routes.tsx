/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SessionsPage } from './pages/sessions/sessions';

export const getRoutes = (): {
  [key: string]: {
    handler: () => React.ReactElement;
    params: Record<string, string>;
    exact: boolean;
  };
} => {
  return {
    '/': {
      handler: () => {
        return <SessionsPage />;
      },
      params: {},
      exact: true,
    },
  };
};
