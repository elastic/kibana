/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EntityManagerOverviewPage } from './pages/overview';

interface RouteDef {
  [key: string]: {
    handler: () => React.ReactElement;
    params: Record<string, string>;
    exact: boolean;
  };
}

export function getRoutes(): RouteDef {
  return {
    '/app/entity_manager': {
      handler: () => <EntityManagerOverviewPage />,
      params: {},
      exact: true,
    },
  };
}
