/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { EuiEmptyPrompt, EuiTitle } from '@elastic/eui';
import { PageTemplate } from './template';
import { useFlowBreadcrumb } from '../shared/use_flow_breadcrumbs';
import { SECTIONS, POPULAR_INTEGRATION_TILES } from './ingest_hub/ingest_hub_data';

const allTiles = [
  ...SECTIONS.flatMap((s) => s.tiles),
  ...POPULAR_INTEGRATION_TILES,
];

export const IntegrationDetailPage = () => {
  const { integration } = useParams<{ integration: string }>();

  const tile = allTiles.find(
    (t) => t.id === integration || t.id === `popular-${integration}`
  );
  const displayName = tile?.name ?? integration ?? '';

  useFlowBreadcrumb({ text: displayName });

  return (
    <PageTemplate>
      <EuiEmptyPrompt
        title={
          <EuiTitle>
            <h2>{displayName}</h2>
          </EuiTitle>
        }
        body={<p>This page is coming soon.</p>}
      />
    </PageTemplate>
  );
};
