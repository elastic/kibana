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
import { EntityInventoryPageShell } from '../application/components/page_shell';
import { EntityCategoryResults } from '../application/components/entity_table/entity_category_results';
import { EntityInventoryPageFilterControls } from '../application/filters/page_filter_controls';
import type { EntityInventoryEntityCategory } from '../types';

// TODO: filter the `types` response by category once entity definitions carry one.
const ENTITY_TYPE_ID_PREFIX_BY_CATEGORY: Readonly<
  Partial<Record<EntityInventoryEntityCategory, string>>
> = {
  hosts: 'host',
  kubernetes: 'k8s.',
};

const EntityInventoryPage = ({
  entityCategory,
}: {
  entityCategory: EntityInventoryEntityCategory;
}) => {
  return (
    <EntityInventoryPageShell
      entityCategory={entityCategory}
      secondaryControls={<EntityInventoryPageFilterControls />}
    >
      <EntityCategoryResults
        entityTypeIdPrefix={ENTITY_TYPE_ID_PREFIX_BY_CATEGORY[entityCategory]}
      />
    </EntityInventoryPageShell>
  );
};

/**
 * The paths of the app are defined here. Each page of `ENTITY_INVENTORY_PAGES` points to one of them.
 */
const entityInventoryRoutes = {
  '/': {
    element: <Outlet />,
    children: {
      '/': { element: <Redirect to="/all-resources" /> },
      '/all-resources': { element: <EntityInventoryPage entityCategory="all" /> },
      '/hosts': { element: <EntityInventoryPage entityCategory="hosts" /> },
      '/kubernetes': { element: <EntityInventoryPage entityCategory="kubernetes" /> },
      '/*': { element: <Redirect to="/all-resources" /> },
    },
  },
} satisfies RouteMap;

export type EntityInventoryPagePath = Exclude<PathsOf<typeof entityInventoryRoutes>, '/' | '/*'>;

export const entityInventoryRouter = createRouter<RouteMap>(entityInventoryRoutes);
