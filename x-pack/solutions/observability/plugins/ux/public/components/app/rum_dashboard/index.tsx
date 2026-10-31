/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { LocalUIFilters } from './local_uifilters';
import { RumDashboard } from './rum_dashboard';
import { useHasRumData } from './hooks/use_has_rum_data';
import { useKibanaServices } from '../../../hooks/use_kibana_services';

export function RumOverview() {
  useTrackPageview({ app: 'ux', path: 'home' });
  useTrackPageview({ app: 'ux', path: 'home', delay: 15000 });
  const { hasData, loading } = useHasRumData();
  const { http, docLinks } = useKibanaServices();

  if (!loading && !hasData) {
    return (
      <EuiEmptyPrompt
        data-test-subj="rumNoDataCard"
        iconType="chartArea"
        title={
          <h2>
            {i18n.translate('xpack.ux.overview.beatsCard.title', {
              defaultMessage: 'Add RUM data',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.ux.overview.otelEmpty.description', {
              defaultMessage:
                'No page-load or EDOT Browser documentLoad data found yet. Capture traffic with Elastic RUM or EDOT Browser (otlp → traces-*.otel-* / logs-*.otel-*), then refresh. The Sessions tab can still list visits that have Session Replay.',
            })}
          </p>
        }
        actions={[
          <EuiButton
            data-test-subj="uxRumOverviewAddRumDataButton"
            href={http.basePath.prepend('/app/apm/tutorial')}
            fill
          >
            {i18n.translate('xpack.ux.overview.beatsCard.buttonLabel', {
              defaultMessage: 'Add RUM data',
            })}
          </EuiButton>,
          <EuiButton
            data-test-subj="uxRumOverviewDocsButton"
            href={docLinks.links.observability.guide}
            target="_blank"
          >
            {i18n.translate('xpack.ux.overview.readDocs', {
              defaultMessage: 'Read the docs',
            })}
          </EuiButton>,
        ]}
      />
    );
  }

  return (
    <>
      <LocalUIFilters />
      <EuiSpacer size="m" />
      <RumDashboard />
    </>
  );
}
