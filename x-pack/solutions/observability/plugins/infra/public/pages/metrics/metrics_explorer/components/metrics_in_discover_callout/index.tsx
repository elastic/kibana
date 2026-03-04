/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { timeseries } from '@kbn/esql-composer';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import type { MetricsExplorerTimeOptions } from '../../hooks/use_metrics_explorer_options';

const calloutTitle = i18n.translate('xpack.infra.metricsExplorer.euiCallout.title', {
  defaultMessage: 'Try the new metrics experience in Discover',
});

const metricsInDiscoverCalloutStorageKey = 'infra.metricsInDiscoverCalloutDismissed';

function getEsqlQuery(metricsIndex: string): string {
  return timeseries(metricsIndex).toString();
}

interface MetricsInDiscoverCalloutProps {
  timeRange: MetricsExplorerTimeOptions;
}

export function MetricsInDiscoverCallout({ timeRange }: MetricsInDiscoverCalloutProps) {
  const { services } = useKibanaContextForPlugin();
  const [dismissedCallout, setDismissedCallout] = useLocalStorage<boolean>(
    metricsInDiscoverCalloutStorageKey,
    false
  );

  const discoverHref = services.share?.url.locators.get(DISCOVER_APP_LOCATOR)?.useUrl({
    timeRange: {
      from: timeRange.from,
      to: timeRange.to,
    },
    query: {
      esql: getEsqlQuery('metrics-*'),
    },
  });

  if (dismissedCallout || !discoverHref) {
    return null;
  }

  function dismissCallout() {
    setDismissedCallout(true);
  }

  function handleViewInDiscoverClick() {
    services.telemetry.reportMetricsExplorerCalloutViewInDiscoverClicked({
      view: 'metrics_explorer',
    });
  }

  return (
    <EuiCallOut
      data-test-subj="infraMetricsExplorerMetricsInDiscoverCallout"
      size="s"
      announceOnMount
      title={
        <EuiLink
          href={discoverHref}
          onClickCapture={handleViewInDiscoverClick}
          data-test-subj="infraMetricsExplorerMetricsInDiscoverCalloutButton"
        >
          {calloutTitle}
        </EuiLink>
      }
      iconType="cheer"
      onDismiss={dismissCallout}
    />
  );
}
