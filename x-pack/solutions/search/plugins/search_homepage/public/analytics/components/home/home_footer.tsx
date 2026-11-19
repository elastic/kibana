/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { ANALYTICS_TELEMETRY_PREFIX } from '../../constants';
import type { AnalyticsLinks, AnalyticsSampleData, ResolvedJourney } from '../../types';
import { JourneySwitch } from '../shared/journey_switch';
import { UseCaseExamples } from '../shared/use_case_examples';

interface HomeFooterProps {
  links: AnalyticsLinks;
  sampleData: AnalyticsSampleData;
  /** Set when the deployment also holds search data. */
  alternativeJourney: ResolvedJourney | undefined;
  onSwitchJourney: (journey: ResolvedJourney) => void;
}

/**
 * Everything that is not the current task: example queries on request, the guided setup, and the
 * way to the search home when the deployment holds search data too.
 */
export const HomeFooter = ({
  links,
  sampleData,
  alternativeJourney,
  onSwitchJourney,
}: HomeFooterProps): React.JSX.Element => (
  <KibanaPageTemplate.Section paddingSize="xl" grow={false} data-test-subj="analyticsHomeFooter">
    <UseCaseExamples page="home" links={links} sampleData={sampleData} />
    <EuiSpacer size="l" />
    <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="spaceBetween" wrap>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          color="text"
          flush="left"
          onClick={links.openOnboarding}
          data-test-subj="analyticsHomeFooterGuidedSetupLink"
          data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-home-guidedSetup`}
        >
          {i18n.translate('xpack.searchHomepage.analytics.home.footer.guidedSetupLink', {
            defaultMessage: 'Guided setup',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      {alternativeJourney !== undefined && (
        <EuiFlexItem grow={false}>
          <JourneySwitch page="home" alternative={alternativeJourney} onSwitch={onSwitchJourney} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  </KibanaPageTemplate.Section>
);
