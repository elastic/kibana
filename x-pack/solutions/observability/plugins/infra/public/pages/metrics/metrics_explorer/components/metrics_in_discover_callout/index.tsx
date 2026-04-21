/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiCallOut, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { timeseries } from '@kbn/esql-composer';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import type { MetricsExplorerTimeOptions } from '../../hooks/use_metrics_explorer_options';

const DOCUMENTATION_URL =
  'https://www.elastic.co/docs/solutions/observability/infra-and-hosts/explore-infrastructure-metrics-over-time';

const buttonLabel = i18n.translate('xpack.infra.metricsExplorer.euiCallout.buttonLabel', {
  defaultMessage: 'View metrics in Discover',
});
const calloutTitle = i18n.translate('xpack.infra.metricsExplorer.deprecationEuiCallout.title', {
  defaultMessage: 'Deprecated',
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
    <>
      <EuiCallOut
        data-test-subj="infraMetricsExplorerMetricsInDiscoverCallout"
        size="m"
        announceOnMount
        color="warning"
        title={calloutTitle}
        iconType="warning"
        onDismiss={dismissCallout}
      >
        <EuiText size="s">
          <FormattedMessage
            id="xpack.infra.metricsExplorer.euiCallout.content"
            defaultMessage="Infrastructure metrics explorer is deprecated and will be removed in a future version. Check out the {documentationLink} and use Discover instead. There, you can see all your metrics in one place, break them down by dimensions, run ES|QL queries, and fine-tune your view."
            values={{
              documentationLink: (
                <EuiLink
                  data-test-subj="infraMetricsExplorerMetricsInDiscoverCalloutLink"
                  href={DOCUMENTATION_URL}
                  target="_blank"
                  external
                >
                  <FormattedMessage
                    id="xpack.infra.metricsExplorer.euiCallout.documentationLinkLabel"
                    defaultMessage="documentation"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
        <EuiSpacer size="m" />
        <EuiButton
          data-test-subj="infraMetricsExplorerMetricsInDiscoverCalloutButton"
          href={discoverHref}
          onClickCapture={handleViewInDiscoverClick}
          aria-label={buttonLabel}
          iconType="discoverApp"
          color="primary"
        >
          {buttonLabel}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
}
