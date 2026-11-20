/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPageSection } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SearchHomepagePage } from '../../../components/search_homepage/search_homepage';
import { ANALYTICS_TELEMETRY_PREFIX } from '../../constants';
import type { AnalyticsLinks, ResolvedJourney } from '../../types';
import { JourneySwitch } from '../shared/journey_switch';
import { searchHomeFooter } from './search_home_styles';

interface SearchHomeProps {
  links: Pick<AnalyticsLinks, 'openOnboarding'>;
  /** Set when the deployment also holds event data. */
  alternativeJourney: ResolvedJourney | undefined;
  onSwitchJourney: (journey: ResolvedJourney) => void;
}

/**
 * The home for search data: the classic Elasticsearch home, unchanged. The shared page takes no
 * extra content, so the way to the guided setup and to the other journey follow it.
 */
export const SearchHome = ({
  links,
  alternativeJourney,
  onSwitchJourney,
}: SearchHomeProps): React.JSX.Element => (
  <>
    <SearchHomepagePage />
    <EuiPageSection
      restrictWidth
      paddingSize="xl"
      grow={false}
      css={searchHomeFooter}
      data-test-subj="searchHomeFooter"
    >
      <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="spaceBetween" wrap>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="text"
            flush="left"
            onClick={links.openOnboarding}
            data-test-subj="searchHomeGuidedSetupLink"
            data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-searchHome-guidedSetup`}
          >
            {i18n.translate('xpack.searchHomepage.analytics.searchHome.guidedSetupLink', {
              defaultMessage: 'Guided setup',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {alternativeJourney !== undefined && (
          <EuiFlexItem grow={false}>
            <JourneySwitch
              page="home"
              alternative={alternativeJourney}
              onSwitch={onSwitchJourney}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPageSection>
  </>
);
