/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import {
  isRunQuotaReached,
  type InvestigationRunQuotaGroup,
  type RunQuotaGroup,
} from '@kbn/significant-events-plugin/common';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { useKibana } from '../../../hooks/use_kibana';

const getExhaustionCopy = (
  group: InvestigationRunQuotaGroup,
  limit: number
): { title: string; text: string } => {
  switch (group) {
    case 'investigation':
      return {
        title: i18n.translate('xpack.nightshift.settings.runLimits.exhaustionTitle', {
          defaultMessage: 'Automations reached a daily run limit of {limit} for this deployment',
          values: { limit },
        }),
        text: i18n.translate('xpack.nightshift.settings.runLimits.exhaustionDescription', {
          defaultMessage:
            'Further triggers will be skipped until the limit resets at midnight (UTC). Already started investigations will continue.',
        }),
      };
    case 'manual_investigation':
      return {
        title: i18n.translate('xpack.nightshift.settings.runLimits.manualExhaustionTitle', {
          defaultMessage:
            'Manual investigations reached a daily limit of {limit} for this deployment',
          values: { limit },
        }),
        text: i18n.translate('xpack.nightshift.settings.runLimits.manualExhaustionDescription', {
          defaultMessage:
            'New investigations from the home page, Slack mentions, the API and the CLI are blocked until the limit resets at midnight (UTC). Follow-ups on open investigations still run, and automations are not affected.',
        }),
      };
    case 'total_investigation':
      return {
        title: i18n.translate('xpack.nightshift.settings.runLimits.totalExhaustionTitle', {
          defaultMessage: 'Investigations reached a daily limit of {limit} for this deployment',
          values: { limit },
        }),
        text: i18n.translate('xpack.nightshift.settings.runLimits.totalExhaustionDescription', {
          defaultMessage:
            'New automatic and manual investigations are blocked until the limit resets at midnight (UTC). Follow-ups on open investigations still run.',
        }),
      };
  }
};

export const RunQuotaExhaustionCallout = ({
  enabled,
  investigationLimitsEnabled,
  limits,
  counts,
  groups,
}: {
  enabled: boolean;
  investigationLimitsEnabled: boolean;
  limits: Record<RunQuotaGroup, number>;
  counts: Record<RunQuotaGroup, number>;
  groups: readonly InvestigationRunQuotaGroup[];
}) => {
  const { application, featureFlags, nightshiftInvestigations } = useKibana().services;
  const nightshiftEnabled = featureFlags.useBooleanValue(NIGHTSHIFT_ENABLED_FLAG, false);
  const canUseAutomations =
    nightshiftEnabled && nightshiftInvestigations?.investigationsClient != null;
  const automationsHref = application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/automations' });
  const exhaustedGroups = groups.filter((group) =>
    isRunQuotaReached({
      group,
      enabled,
      investigationLimitsEnabled,
      limit: limits[group],
      count: counts[group],
    })
  );

  if (exhaustedGroups.length === 0) {
    return null;
  }

  return (
    <>
      {exhaustedGroups.map((group) => {
        const { title, text } = getExhaustionCopy(group, limits[group]);
        return (
          <React.Fragment key={group}>
            <EuiSpacer />
            <KbnWarningCallout
              announceOnMount
              size="s"
              data-test-subj={`nightshiftRunLimitsBanner-${group}`}
              title={title}
              text={text}
              actionProps={
                canUseAutomations && group !== 'manual_investigation'
                  ? {
                      primary: {
                        children: i18n.translate(
                          'xpack.nightshift.settings.runLimits.openAutomationsButton',
                          {
                            defaultMessage: 'Open automations',
                          }
                        ),
                        href: automationsHref,
                        onClick: (event: React.MouseEvent) => {
                          event.preventDefault();
                          application.navigateToUrl(automationsHref);
                        },
                        'data-test-subj': 'nightshiftRunLimitsOpenAutomations',
                        ...getEbtProps({
                          action: NIGHTSHIFT_EBT_ACTIONS.VIEW_AUTOMATIONS,
                          element: NIGHTSHIFT_EBT_ELEMENTS.SETTINGS,
                        }),
                      },
                    }
                  : undefined
              }
            />
          </React.Fragment>
        );
      })}
      <EuiSpacer />
    </>
  );
};
