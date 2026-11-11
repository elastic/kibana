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
import { ENTITY_TYPE_BY_CATEGORY } from '../application/components/entity_table/entity_type_config';
import { EntityTypeResults } from '../application/components/entity_table/entity_type_results';
import { EntityInventoryPageFilterControls } from '../application/filters/page_filter_controls';
import { ENTITY_LIST_PLACEHOLDER } from '../application/translations';
import type { EntityInventoryEntityCategory } from '../types';

const EntityInventoryPage = ({
  entityCategory,
}: {
  entityCategory: EntityInventoryEntityCategory;
}) => {
  const entityType = ENTITY_TYPE_BY_CATEGORY[entityCategory];

  return (
    <EntityInventoryPageShell
      entityCategory={entityCategory}
      secondaryControls={<EntityInventoryPageFilterControls />}
    >
      {entityType ? (
        <EntityTypeResults entityType={entityType} />
      ) : (
        // All resources lists one table per group once grouping lands (#6340).
        <EuiText color="subdued" data-test-subj="entityInventoryPlaceholder">
          <p>{ENTITY_LIST_PLACEHOLDER}</p>
        </EuiText>
      )}
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
