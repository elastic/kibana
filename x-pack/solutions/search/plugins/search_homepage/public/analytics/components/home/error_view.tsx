/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ref } from 'react';
import React from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { ANALYTICS_TELEMETRY_PREFIX } from '../../constants';
import type { AnalyticsLinks } from '../../types';
import { AddSourceButton } from '../shared/add_source_button';
import { HomeHeader } from './home_header';

interface ErrorViewProps {
  headingRef: Ref<HTMLHeadingElement>;
  links: AnalyticsLinks;
  isRetrying: boolean;
  onRetry: () => void;
}

/** Shown when the deployment could not be inspected: retry first, adding data stays possible. */
export const ErrorView = ({
  headingRef,
  links,
  isRetrying,
  onRetry,
}: ErrorViewProps): React.JSX.Element => (
  <KibanaPageTemplate.Section paddingSize="xl" grow={false} data-test-subj="analyticsHomeError">
    <HomeHeader
      headingRef={headingRef}
      title={i18n.translate('xpack.searchHomepage.analytics.home.error.title', {
        defaultMessage: 'Welcome to Elasticsearch',
      })}
    />
    <KbnWarningCallout
      announceOnMount
      title={i18n.translate('xpack.searchHomepage.analytics.home.error.calloutTitle', {
        defaultMessage: 'Unable to check this deployment for data',
      })}
      actionProps={{
        primary: {
          iconType: 'refresh',
          onClick: onRetry,
          isLoading: isRetrying,
          'data-test-subj': 'analyticsHomeRetry',
          'data-telemetry-id': `${ANALYTICS_TELEMETRY_PREFIX}-home-retry`,
          children: i18n.translate('xpack.searchHomepage.analytics.home.error.retryButton', {
            defaultMessage: 'Try again',
          }),
        },
      }}
      data-test-subj="analyticsHomeErrorCallout"
    />
    <EuiHorizontalRule margin="l" />
    <AddSourceButton
      page="home"
      name="AddSource"
      emphasis="low"
      audience="all"
      links={links}
      label={i18n.translate('xpack.searchHomepage.analytics.home.error.connectButton', {
        defaultMessage: 'Add data',
      })}
    />
  </KibanaPageTemplate.Section>
);
