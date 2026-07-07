/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EnterpriseSearchAnalyticsPageTemplate } from '../../layout/page_template';
import { AnalyticsCollectionExploreTableLogic } from '../analytics_collection_explore_table_logic';
import { AnalyticsCollectionToolbar } from '../analytics_collection_toolbar/analytics_collection_toolbar';
import { FetchAnalyticsCollectionLogic } from '../fetch_analytics_collection_logic';

import { AnalyticsCollectionExplorerTable } from './analytics_collection_explorer_table';

export const AnalyticsCollectionExplorer: React.FC = ({}) => {
  const { analyticsCollection } = useValues(FetchAnalyticsCollectionLogic);
  const { reset } = useActions(AnalyticsCollectionExploreTableLogic);

  useEffect(() => {
    return () => {
      reset();
    };
  }, []);

  return (
    <EnterpriseSearchAnalyticsPageTemplate
      restrictWidth
      pageChrome={[analyticsCollection?.name]}
      analyticsName={analyticsCollection?.name}
      pageViewTelemetry={`View Analytics Collection - explorer`}
      pageHeader={{
        bottomBorder: false,
        pageTitle: (
          <EuiFlexGroup responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h1>
                  {i18n.translate(
                    'xpack.enterpriseSearch.analytics.collectionsView.explorerView.title',
                    {
                      defaultMessage: 'Explorer',
                    }
                  )}
                </h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">
                {i18n.translate('xpack.enterpriseSearch.analytics.collections.deprecatedBadge', {
                  defaultMessage: 'Deprecated',
                })}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),

        rightSideItems: [<AnalyticsCollectionToolbar />],
      }}
    >
      <AnalyticsCollectionExplorerTable />
    </EnterpriseSearchAnalyticsPageTemplate>
  );
};
