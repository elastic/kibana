/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_DISCOVERY } from '@kbn/management-settings-ids';
import { NightshiftApp } from './components/nightshift_app';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { OVERVIEW_PATH } from '../../../common/locators/paths';
import { useFetchSignificantEventsAvailability } from './hooks/use_fetch_significant_events_availability';

export function NightshiftPage(): React.ReactElement | null {
  const {
    http: { basePath },
    uiSettings,
    serverless,
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const history = useHistory();

  const isDiscoveryEnabled = uiSettings.get<boolean>(
    OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_DISCOVERY,
    false
  );

  useBreadcrumbs(
    [
      {
        href: basePath.prepend('/app/observability/nightshift'),
        text: i18n.translate('xpack.observability.breadcrumbs.nightshiftLinkText', {
          defaultMessage: 'Nightshift',
        }),
        deepLinkId: 'observability-overview:nightshift',
      },
    ],
    { serverless }
  );

  const {
    data: availability,
    isLoading: isAvailabilityLoading,
    isFetching: isAvailabilityFetching,
  } = useFetchSignificantEventsAvailability(isDiscoveryEnabled);
  const isAvailable = availability?.available === true;

  const shouldRedirect =
    !isDiscoveryEnabled || (!isAvailabilityLoading && !isAvailabilityFetching && !isAvailable);

  useEffect(() => {
    if (shouldRedirect) {
      history.replace(OVERVIEW_PATH);
    }
  }, [history, shouldRedirect]);

  if (!isDiscoveryEnabled || !isAvailable) {
    return null;
  }

  return (
    <ObservabilityPageTemplate
      data-test-subj="nightshiftPage"
      restrictWidth="900px"
      pageSectionProps={{
        color: 'subdued',
      }}
    >
      <NightshiftApp />
    </ObservabilityPageTemplate>
  );
}
