/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ref } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { AnalyticsLinks, AnalyticsSampleData } from '../../types';
import { IngestGate } from '../shared/ingest_gate';
import { HomeHeader } from './home_header';

interface NoDataViewProps {
  headingRef: Ref<HTMLHeadingElement>;
  links: AnalyticsLinks;
  sampleData: AnalyticsSampleData;
  onSampleInstalled: () => void;
}

/** The home of an empty deployment: the ingest gate and nothing else. */
export const NoDataView = ({
  headingRef,
  links,
  sampleData,
  onSampleInstalled,
}: NoDataViewProps): React.JSX.Element => (
  <KibanaPageTemplate.Section paddingSize="xl" grow={false} data-test-subj="analyticsHomeNoData">
    <HomeHeader
      headingRef={headingRef}
      title={i18n.translate('xpack.searchHomepage.analytics.home.noData.title', {
        defaultMessage: 'Add your data to get started',
      })}
      description={i18n.translate('xpack.searchHomepage.analytics.home.noData.description', {
        defaultMessage:
          'Everything in Elasticsearch starts with your data. Add some, and this page shows you what to do with it next.',
      })}
    />
    <IngestGate
      page="home"
      title={i18n.translate('xpack.searchHomepage.analytics.home.noData.connectTitle', {
        defaultMessage: 'Choose how to add data',
      })}
      links={links}
      sampleData={sampleData}
      onSampleInstalled={onSampleInstalled}
    />
  </KibanaPageTemplate.Section>
);
