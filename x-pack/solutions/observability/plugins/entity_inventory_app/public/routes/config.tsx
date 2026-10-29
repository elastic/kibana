/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import type { PathsOf, RouteMap } from '@kbn/typed-react-router-config';

function EntityInventoryContent() {
  return (
    <>
      <br />
      <h1>Entity Inventory content here.</h1>
    </>
  );
}

/**
 * The paths of the app are defined here. Each page of `ENTITY_INVENTORY_PAGES` points to one of them.
 */
const entityInventoryRoutes = {
  '/': {
    element: <Outlet />,
    children: {
      '/': { element: <Redirect to="/all-resources" /> },
      '/all-resources': { element: <EntityInventoryContent /> },
      '/hosts': { element: <EntityInventoryContent /> },
      '/kubernetes': { element: <EntityInventoryContent /> },
      '/*': { element: <Redirect to="/all-resources" /> },
    },
  },
} satisfies RouteMap;

export type EntityInventoryPagePath = Exclude<PathsOf<typeof entityInventoryRoutes>, '/' | '/*'>;

export const entityInventoryRouter = createRouter<RouteMap>(entityInventoryRoutes);
