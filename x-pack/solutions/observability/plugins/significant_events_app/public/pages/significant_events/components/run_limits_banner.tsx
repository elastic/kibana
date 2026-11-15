/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { NIGHTSHIFT_SETTINGS_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import type { NightshiftSettingsLocatorParams } from '@kbn/nightshift-shared';
import type { RunQuotaGroup } from '@kbn/significant-events-plugin/common';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useRunQuotas } from '../../../hooks/use_significant_events_run_quotas';
import { useKibana } from '../../../hooks/use_kibana';

const RUN_QUOTA_GROUPS: readonly RunQuotaGroup[] = ['detection', 'investigation', 'ki_extraction'];

const RUN_QUOTA_GROUP_LABELS: Record<RunQuotaGroup, string> = {
  detection: i18n.translate('xpack.significantEventsApp.runLimitsBanner.groupLabel.detection', {
    defaultMessage: 'Discovery',
  }),
  investigation: i18n.translate(
    'xpack.significantEventsApp.runLimitsBanner.groupLabel.investigation',
    { defaultMessage: 'Investigation' }
  ),
  ki_extraction: i18n.translate(
    'xpack.significantEventsApp.runLimitsBanner.groupLabel.kiExtraction',
    { defaultMessage: 'Knowledge indicator extraction' }
  ),
};

const isFiniteRunLimit = (limit: number): boolean => limit > 0;

interface RunQuotaExhaustionCalloutProps {
  enabled: boolean;
  limits: Record<RunQuotaGroup, number>;
  counts: Record<RunQuotaGroup, number>;
  canManage?: boolean;
  manageHref?: string;
  groups?: readonly RunQuotaGroup[];
}

export const getExhaustedRunQuotaGroups = ({
  enabled,
  limits,
  counts,
  groups = RUN_QUOTA_GROUPS,
}: Pick<
  RunQuotaExhaustionCalloutProps,
  'enabled' | 'limits' | 'counts' | 'groups'
>): RunQuotaGroup[] =>
  enabled
    ? groups.filter((group) => isFiniteRunLimit(limits[group]) && counts[group] >= limits[group])
    : [];

export const getRunQuotaSettingsTab = (
  groups: readonly RunQuotaGroup[]
): 'investigations' | 'detections' =>
  groups.length > 0 && groups.every((group) => group === 'investigation')
    ? 'investigations'
    : 'detections';

export const RunQuotaExhaustionCallout = ({
  enabled,
  limits,
  counts,
  canManage,
  manageHref,
  groups,
}: RunQuotaExhaustionCalloutProps) => {
  const exhaustedGroups = getExhaustedRunQuotaGroups({ enabled, limits, counts, groups });
  if (exhaustedGroups.length === 0) {
    return null;
  }

  const reached = i18n.formatList(
    'conjunction',
    exhaustedGroups.map((group) =>
      i18n.translate('xpack.significantEventsApp.runLimitsBanner.reachedGroupDetail', {
        defaultMessage: '{group}: {count} counted scheduled admissions, daily limit {limit}',
        values: {
          group: RUN_QUOTA_GROUP_LABELS[group],
          count: counts[group],
          limit: limits[group],
        },
      })
    )
  );

  const description = i18n.translate('xpack.significantEventsApp.runLimitsBanner.description', {
    defaultMessage:
      'Reached limits: {reached}. New scheduled admissions in these categories can be denied until the UTC day resets. Manual runs are not limited.',
    values: { reached },
  });
  const readOnlyDescription =
    manageHref && !canManage
      ? i18n.translate('xpack.significantEventsApp.runLimitsBanner.readOnlyDescription', {
          defaultMessage:
            'An administrator with the Nightshift Manage engines privilege can change these limits.',
        })
      : undefined;

  return (
    <KbnWarningCallout
      announceOnMount
      size="s"
      data-test-subj="significantEventsRunLimitsBanner"
      title={i18n.translate('xpack.significantEventsApp.runLimitsBanner.title', {
        defaultMessage: 'Scheduled automation has reached a daily run limit',
      })}
      text={readOnlyDescription ? `${description} ${readOnlyDescription}` : description}
      actionProps={
        manageHref && canManage
          ? {
              primary: {
                children: i18n.translate(
                  'xpack.significantEventsApp.runLimitsBanner.manageButtonLabel',
                  {
                    defaultMessage: 'Review run limits',
                  }
                ),
                href: manageHref,
                'data-test-subj':
                  'significantEventsAppRunQuotaExhaustionCalloutReviewRunLimitsButton',
              },
            }
          : undefined
      }
    />
  );
};

export const RunLimitsBanner = () => {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const { data } = useRunQuotas();

  if (!data) {
    return null;
  }

  const exhaustedGroups = getExhaustedRunQuotaGroups({
    enabled: data.enabled,
    limits: data.limits,
    counts: data.counts,
  });

  if (exhaustedGroups.length === 0) {
    return null;
  }
  const settingsLocator = share.url.locators.get<NightshiftSettingsLocatorParams>(
    NIGHTSHIFT_SETTINGS_LOCATOR_ID
  );

  return (
    <>
      <RunQuotaExhaustionCallout
        enabled={data.enabled}
        limits={data.limits}
        counts={data.counts}
        canManage={data.canManage}
        manageHref={settingsLocator?.getRedirectUrl({
          tab: getRunQuotaSettingsTab(exhaustedGroups),
        })}
      />
      <EuiSpacer />
    </>
  );
};
