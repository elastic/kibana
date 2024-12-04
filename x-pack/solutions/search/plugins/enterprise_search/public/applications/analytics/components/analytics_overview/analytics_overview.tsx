/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../shared/kibana';
import { LicensingLogic } from '../../../shared/licensing';
import {
  LicensingCallout,
  LICENSING_FEATURE,
} from '../../../shared/licensing_callout/licensing_callout';
import { AddAnalyticsCollection } from '../add_analytics_collections/add_analytics_collection';

import { EnterpriseSearchAnalyticsPageTemplate } from '../layout/page_template';

import { AnalyticsCollectionTable } from './analytics_collection_table';
import { AnalyticsCollectionsLogic } from './analytics_collections_logic';
import { AnalyticsOverviewEmptyPage } from './analytics_overview_empty_page';

export const AnalyticsOverview: React.FC = () => {
  const { fetchAnalyticsCollections, searchAnalyticsCollections } =
    useActions(AnalyticsCollectionsLogic);
  const { analyticsCollections, hasNoAnalyticsCollections, isFetching, isSearching } =
    useValues(AnalyticsCollectionsLogic);

  const { isCloud } = useValues(KibanaLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const isGated = !isCloud && !hasPlatinumLicense;

  useEffect(() => {
    if (isGated) return;
    fetchAnalyticsCollections();
  }, []);

  return (
    <EnterpriseSearchAnalyticsPageTemplate
      pageChrome={[]}
      restrictWidth
      isLoading={isFetching && !isGated}
      pageViewTelemetry="Analytics Collections Overview"
      pageHeader={{
        description: i18n.translate(
          'xpack.enterpriseSearch.analytics.collections.pageDescription',
          {
            defaultMessage:
              'Dashboards and tools for visualizing end-user behavior and measuring the performance of your search applications. Track trends over time, identify and investigate anomalies, and make optimizations.',
          }
        ),
        pageTitle: i18n.translate('xpack.enterpriseSearch.analytics.collections.pageTitle', {
          defaultMessage: 'Behavioral Analytics',
        }),
        rightSideItems: [<AddAnalyticsCollection disabled={isGated} />],
      }}
    >
      {isGated ? (
        <EuiFlexItem>
          <LicensingCallout feature={LICENSING_FEATURE.ANALYTICS} />
        </EuiFlexItem>
      ) : hasNoAnalyticsCollections && !isSearching ? (
        <>
          <EuiSpacer size="l" />
          <AnalyticsOverviewEmptyPage />
        </>
      ) : (
        <AnalyticsCollectionTable
          collections={analyticsCollections}
          isSearching={isSearching}
          onSearch={searchAnalyticsCollections}
        />
      )}
    </EnterpriseSearchAnalyticsPageTemplate>
  );
};
