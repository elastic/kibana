/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { timeseries } from '@kbn/esql-composer';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import type { MetricsExplorerTimeOptions } from '../../hooks/use_metrics_explorer_options';

const buttonLabel = i18n.translate('xpack.infra.metricsExplorer.euiCallout.buttonLabel', {
  defaultMessage: 'View metrics in Discover',
});
const calloutTitle = i18n.translate('xpack.infra.metricsExplorer.euiCallout.title', {
  defaultMessage: 'Try the new metrics experience in Discover',
});
const calloutContent = i18n.translate('xpack.infra.metricsExplorer.euiCallout.content', {
  defaultMessage:
    'See all metrics in one place, break them down by dimesions, run ES|QL queries, and fine-tune your view.',
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

  const discoverHref = useMemo(() => {
    if (!services.share) return undefined;
    return services.share.url.locators.get(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
      timeRange: {
        from: timeRange.from,
        to: timeRange.to,
      },
      query: {
        esql: getEsqlQuery('metrics-*'),
      },
    });
  }, [services.share, timeRange]);

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
    <>
      <EuiCallOut
        data-test-subj="infraMetricsExplorerMetricsInDiscoverCallout"
        size="m"
        announceOnMount
        title={calloutTitle}
        iconType="cheer"
        onDismiss={dismissCallout}
      >
        <EuiText size="s">{calloutContent}</EuiText>
        <EuiSpacer size="m" />
        {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
        <EuiButton
          data-test-subj="infraMetricsExplorerMetricsInDiscoverCalloutButton"
          fill
          href={discoverHref}
          onClick={handleViewInDiscoverClick}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
}
