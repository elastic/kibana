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

/**
 * The entity types each page lists, one section per type; a page without an entry, All resources,
 * lists every type of the `types` response. The only place in the app that names a type: it is
 * replaced by filtering the `types` response by category when entity definitions carry one.
 */
const ENTITY_TYPES_BY_CATEGORY: Readonly<
  Partial<Record<EntityInventoryEntityCategory, readonly string[]>>
> = {
  hosts: ['host'],
  kubernetes: ['k8s.deployment'],
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
      <EntityCategoryResults entityTypes={ENTITY_TYPES_BY_CATEGORY[entityCategory]} />
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
