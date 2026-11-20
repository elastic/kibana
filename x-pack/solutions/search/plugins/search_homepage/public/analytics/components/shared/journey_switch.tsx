/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ResolvedJourney } from '../../types';
import type { AnalyticsPageId } from './page_ids';
import { getPageTelemetryId, getPageTestSubj } from './page_ids';

interface JourneySwitchProps {
  page: AnalyticsPageId;
  /** The journey the deployment's other kind of data supports. */
  alternative: ResolvedJourney;
  onSwitch: (journey: ResolvedJourney) => void;
}

const getCopy = (
  page: AnalyticsPageId,
  alternative: ResolvedJourney
): { prompt: string; action: string } => {
  if (alternative === 'search') {
    return {
      prompt: i18n.translate('xpack.searchHomepage.analytics.journeySwitch.searchPrompt', {
        defaultMessage: 'Looking for search?',
      }),
      action:
        page === 'home'
          ? i18n.translate('xpack.searchHomepage.analytics.journeySwitch.searchHomeAction', {
              defaultMessage: 'Show the search home',
            })
          : i18n.translate('xpack.searchHomepage.analytics.journeySwitch.searchSetupAction', {
              defaultMessage: 'Show the search setup',
            }),
    };
  }
  return {
    prompt: i18n.translate('xpack.searchHomepage.analytics.journeySwitch.analyticsPrompt', {
      defaultMessage: 'Looking for event analytics?',
    }),
    action:
      page === 'home'
        ? i18n.translate('xpack.searchHomepage.analytics.journeySwitch.analyticsHomeAction', {
            defaultMessage: 'Show the analytics home',
          })
        : i18n.translate('xpack.searchHomepage.analytics.journeySwitch.analyticsSetupAction', {
            defaultMessage: 'Show the analytics setup',
          }),
  };
};

/** The one way to the other journey, shown only when the deployment holds both kinds of data. */
export const JourneySwitch = ({
  page,
  alternative,
  onSwitch,
}: JourneySwitchProps): React.JSX.Element => {
  const { prompt, action } = getCopy(page, alternative);

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      wrap
      responsive={false}
      data-test-subj={getPageTestSubj(page, 'JourneySwitch')}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          <p>{prompt}</p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          color="text"
          onClick={() => onSwitch(alternative)}
          data-test-subj={getPageTestSubj(page, `SwitchTo-${alternative}`)}
          data-telemetry-id={getPageTelemetryId(page, `switchTo-${alternative}`)}
        >
          {action}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
