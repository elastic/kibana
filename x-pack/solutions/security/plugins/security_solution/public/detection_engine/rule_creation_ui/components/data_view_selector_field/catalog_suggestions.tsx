/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { useCatalogDataSources } from './use_catalog_data_sources';
import { CatalogDataSourceBadge } from './catalog_data_source_badge';

export const CatalogSuggestions: React.FC = () => {
  const { dataSources, isLoading } = useCatalogDataSources();

  const activeDataSources = dataSources.filter((ds) => ds.freshness !== 'empty');

  if (isLoading || activeDataSources.length === 0) return null;

  return (
    <>
      <EuiSpacer size="s" />
      <EuiPanel paddingSize="s" color="subdued" hasBorder={false}>
        <EuiTitle size="xxxs">
          <h6>{'Available data sources'}</h6>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiFlexGroup direction="column" gutterSize="xs">
          {activeDataSources.slice(0, 8).map((ds) => (
            <EuiFlexItem key={ds.name} grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
                <EuiFlexItem grow>
                  <EuiText size="xs">
                    <code>{ds.name}</code>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <CatalogDataSourceBadge
                    integrationTitle={ds.integrationTitle}
                    freshness={ds.freshness}
                    docCount={ds.docCount}
                    ecsFieldCoverage={ds.ecsFieldCoverage}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
