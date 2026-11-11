/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { EuiText } from '@elastic/eui';
import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import type { PathsOf, RouteMap } from '@kbn/typed-react-router-config';
import { EntityInventoryPageShell } from '../application/components/page_shell';
import { EntityCategoryResults } from '../application/components/entity_table/entity_category_results';
import { EntityTypesProvider } from '../application/context/entity_types_context';
import { EntityInventoryPageFilterControls } from '../application/filters/page_filter_controls';
import { ENTITY_LIST_PLACEHOLDER } from '../application/translations';
import type { EntityInventoryEntityCategory } from '../types';

/**
 * The entity types each page lists, one section per type; All resources lists groups instead
 * (#6340). The only place in the app that names a type: it is replaced by filtering the `types`
 * response by category when definitions carry one (elastic/observability-dev#6239).
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
  const entityTypes = ENTITY_TYPES_BY_CATEGORY[entityCategory];

  return (
    // Keyed by page, so a page change requests the types again.
    <EntityTypesProvider key={entityCategory}>
      <EntityInventoryPageShell
        entityCategory={entityCategory}
        secondaryControls={<EntityInventoryPageFilterControls />}
      >
        {entityTypes ? (
          <EntityCategoryResults entityTypes={entityTypes} />
        ) : (
          // All resources lists one table per group once grouping lands (#6340).
          <EuiText color="subdued" data-test-subj="entityInventoryPlaceholder">
            <p>{ENTITY_LIST_PLACEHOLDER}</p>
          </EuiText>
        )}
      </EntityInventoryPageShell>
    </EntityTypesProvider>
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
