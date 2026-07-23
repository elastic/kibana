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
import { STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG } from '@kbn/streams-plugin/common';
import { NightshiftApp } from './components/nightshift_app';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { OVERVIEW_PATH } from '../../../common/locators/paths';

export function NightshiftPage(): React.ReactElement | null {
  const {
    http: { basePath },
    featureFlags,
    serverless,
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const history = useHistory();

  // Availability is owned by this flag alone — the /available endpoint is the same
  // gate on the server, so a second client probe would only duplicate it.
  const isEnabled = featureFlags.getBooleanValue(STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG, false);

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

  useEffect(() => {
    if (!isEnabled) {
      history.replace(OVERVIEW_PATH);
    }
  }, [history, isEnabled]);

  if (!isEnabled) {
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
