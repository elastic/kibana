/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAnalyticsPreferences } from '../../hooks/use_analytics_preferences';
import type { SourceGenerationResult } from '../../hooks/use_source_generation';
import type { AnalyticsEventSource, AnalyticsLinks } from '../../types';
import type { AnalyticsPageId } from './page_ids';
import { getPageTelemetryId, getPageTestSubj } from './page_ids';

interface BuildDashboardButtonProps {
  page: AnalyticsPageId;
  source: AnalyticsEventSource | undefined;
  fill: boolean;
  links: Pick<AnalyticsLinks, 'canCreateDashboard' | 'createSourceDashboard'>;
  /** Panels a model wrote for the source, used when they are ready at the time of the click. */
  generation?: SourceGenerationResult;
}

const getDisabledReason = (
  canCreateDashboard: boolean,
  source: AnalyticsEventSource | undefined
): string | undefined => {
  if (!canCreateDashboard) {
    return i18n.translate('xpack.searchHomepage.analytics.buildDashboard.missingPrivilege', {
      defaultMessage: 'You need permission to create dashboards.',
    });
  }
  if (source === undefined) {
    return i18n.translate('xpack.searchHomepage.analytics.buildDashboard.noSource', {
      defaultMessage: 'Connect an event source first, so the dashboard has events to show.',
    });
  }
  return undefined;
};

/** Opens a dashboard pre-populated with panels over one of the user's event sources. */
export const BuildDashboardButton = ({
  page,
  source,
  fill,
  links,
  generation,
}: BuildDashboardButtonProps): React.JSX.Element => {
  const { selectedUseCaseId } = useAnalyticsPreferences();
  const generatedPanels =
    generation?.data?.source === source?.name ? generation?.data?.panels ?? undefined : undefined;
  const disabledReason = getDisabledReason(links.canCreateDashboard, source);

  return (
    <EuiToolTip content={disabledReason}>
      <EuiButton
        fill={fill}
        iconType="dashboardApp"
        onClick={() => {
          if (source !== undefined) {
            links.createSourceDashboard(source, { selectedUseCaseId, generatedPanels });
          }
        }}
        isDisabled={disabledReason !== undefined}
        hasAriaDisabled
        data-test-subj={getPageTestSubj(page, 'BuildSourceDashboard')}
        data-telemetry-id={getPageTelemetryId(page, 'buildSourceDashboard')}
      >
        {source === undefined
          ? i18n.translate('xpack.searchHomepage.analytics.buildDashboard.button', {
              defaultMessage: 'Build a dashboard',
            })
          : i18n.translate('xpack.searchHomepage.analytics.buildDashboard.sourceButton', {
              defaultMessage: 'Build a dashboard from {sourceName}',
              values: { sourceName: source.name },
            })}
      </EuiButton>
    </EuiToolTip>
  );
};
