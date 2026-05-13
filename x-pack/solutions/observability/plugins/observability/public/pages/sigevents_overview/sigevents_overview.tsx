/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_DISCOVERY } from '@kbn/management-settings-ids';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { OVERVIEW_PATH } from '../../../common/locators/paths';

export function SigeventsOverviewPage() {
  const {
    http: { basePath },
    uiSettings,
    serverless,
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const history = useHistory();

  const isEnabled = uiSettings.get<boolean>(
    OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_DISCOVERY,
    false
  );

  useBreadcrumbs(
    [
      {
        href: basePath.prepend('/app/observability/sigevents_overview'),
        text: i18n.translate('xpack.observability.breadcrumbs.nightshiftLinkText', {
          defaultMessage: 'Nightshift',
        }),
        deepLinkId: 'observability-overview:sigevents_overview',
      },
    ],
    { serverless }
  );

  if (!isEnabled) {
    history.replace(OVERVIEW_PATH);
    return null;
  }

  return (
    <ObservabilityPageTemplate data-test-subj="sigeventsOverviewPage">
      {i18n.translate('xpack.observability.sigeventsOverview.body', {
        defaultMessage: '🚧 Coming soon ✨🌙.',
      })}
    </ObservabilityPageTemplate>
  );
}
