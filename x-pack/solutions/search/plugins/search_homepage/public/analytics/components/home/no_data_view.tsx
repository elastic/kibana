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
import type { AnalyticsLinks, AnalyticsSampleData, AnalyticsSourceAudience } from '../../types';
import { getEventsGateDescription, getEventsGateTitle } from '../shared/events_gate_copy';
import { IngestGate } from '../shared/ingest_gate';
import { HomeHeader } from './home_header';

interface NoDataViewProps {
  headingRef: Ref<HTMLHeadingElement>;
  /** `events` for a user who asked for event analytics before the deployment had data. */
  audience: AnalyticsSourceAudience;
  links: AnalyticsLinks;
  sampleData: AnalyticsSampleData;
  onSampleInstalled: () => void;
}

/** The home of an empty deployment: the ingest gate and nothing else. */
export const NoDataView = ({
  headingRef,
  audience,
  links,
  sampleData,
  onSampleInstalled,
}: NoDataViewProps): React.JSX.Element => (
  <KibanaPageTemplate.Section paddingSize="xl" grow={false} data-test-subj="analyticsHomeNoData">
    {audience === 'events' ? (
      <HomeHeader
        headingRef={headingRef}
        title={getEventsGateTitle()}
        description={getEventsGateDescription()}
      />
    ) : (
      <HomeHeader
        headingRef={headingRef}
        title={i18n.translate('xpack.searchHomepage.analytics.home.noData.title', {
          defaultMessage: 'Add your data',
        })}
      />
    )}
    <IngestGate
      page="home"
      title={
        audience === 'events'
          ? i18n.translate('xpack.searchHomepage.analytics.home.noData.eventsConnectTitle', {
              defaultMessage: 'Choose how to add events',
            })
          : i18n.translate('xpack.searchHomepage.analytics.home.noData.connectTitle', {
              defaultMessage: 'Choose how to add data',
            })
      }
      audience={audience}
      links={links}
      sampleData={sampleData}
      onSampleInstalled={onSampleInstalled}
    />
  </KibanaPageTemplate.Section>
);
