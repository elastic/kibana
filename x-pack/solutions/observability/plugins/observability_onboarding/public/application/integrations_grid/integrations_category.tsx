/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { IntegrationTile } from './integration_tile';
import type { IntegrationCategoryDefinition } from './tiles_config';

interface Props {
  category: IntegrationCategoryDefinition;
}

export const IntegrationsCategory = ({ category }: Props) => {
  const labelId = `integrationsCategory-${category.id}`;

  return (
    <section aria-labelledby={labelId}>
      <EuiTitle size="xxs">
        <h4 id={labelId}>{category.label}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGrid columns={3} gutterSize="m">
        {category.tiles.map((tile) => (
          <EuiFlexItem key={tile.id}>
            <IntegrationTile tile={tile} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </section>
  );
};
