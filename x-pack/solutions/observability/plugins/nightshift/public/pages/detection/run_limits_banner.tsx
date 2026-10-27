/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import type { RunQuotaGroup } from '@kbn/significant-events-plugin/common';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useBlocksNewActivity } from '../../data/maintenance/use_significant_events_maintenance';
import { useRunQuotas } from '../../data/run_quotas/use_significant_events_run_quotas';
import { useKibana } from '../../hooks/use_kibana';

const RUN_QUOTA_GROUPS: readonly RunQuotaGroup[] = ['detection', 'investigation', 'ki_extraction'];

const RUN_QUOTA_GROUP_LABELS: Record<RunQuotaGroup, string> = {
  detection: i18n.translate('xpack.nightshift.detectionPage.runLimitsBanner.groupLabel.detection', {
    defaultMessage: 'Discovery',
  }),
  investigation: i18n.translate(
    'xpack.nightshift.detectionPage.runLimitsBanner.groupLabel.investigation',
    { defaultMessage: 'Investigation' }
  ),
  ki_extraction: i18n.translate(
    'xpack.nightshift.detectionPage.runLimitsBanner.groupLabel.kiExtraction',
    { defaultMessage: 'Knowledge indicator extraction' }
  ),
};

const isFiniteRunLimit = (limit: number): boolean => limit > 0;

const getExhaustedRunQuotaGroups = ({
  enabled,
  limits,
  counts,
}: {
  enabled: boolean;
  limits: Record<RunQuotaGroup, number>;
  counts: Record<RunQuotaGroup, number>;
}): RunQuotaGroup[] =>
  enabled
    ? RUN_QUOTA_GROUPS.filter(
        (group) => isFiniteRunLimit(limits[group]) && counts[group] >= limits[group]
      )
    : [];

export const getRunQuotaSettingsTab = (
  groups: readonly RunQuotaGroup[]
): 'investigations' | 'detections' =>
  groups.length > 0 && groups.every((group) => group === 'investigation')
    ? 'investigations'
    : 'detections';

export const RunLimitsBanner = (): React.ReactElement | null => {
  const { application } = useKibana().services;
  const { data } = useRunQuotas();
  const { isBlocked } = useBlocksNewActivity();

  if (isBlocked || !data) {
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

  const reached = i18n.formatList(
    'conjunction',
    exhaustedGroups.map((group) =>
      i18n.translate('xpack.nightshift.detectionPage.runLimitsBanner.reachedGroupDetail', {
        defaultMessage: '{group}: {count} counted scheduled admissions, daily limit {limit}',
        values: {
          group: RUN_QUOTA_GROUP_LABELS[group],
          count: data.counts[group],
          limit: data.limits[group],
        },
      })
    )
  );
  const description = i18n.translate('xpack.nightshift.detectionPage.runLimitsBanner.description', {
    defaultMessage:
      'Reached limits: {reached}. New scheduled admissions in these categories can be denied until the UTC day resets. Manual runs are not limited.',
    values: { reached },
  });
  const readOnlyDescription = !data.canManage
    ? i18n.translate('xpack.nightshift.detectionPage.runLimitsBanner.readOnlyDescription', {
        defaultMessage:
          'An administrator with the Nightshift Manage engines privilege can change these limits.',
      })
    : undefined;

  return (
    <>
      <KbnWarningCallout
        announceOnMount
        size="s"
        data-test-subj="nightshiftDetectionRunLimitsBanner"
        title={i18n.translate('xpack.nightshift.detectionPage.runLimitsBanner.title', {
          defaultMessage: 'Scheduled automation has reached a daily run limit',
        })}
        text={readOnlyDescription ? `${description} ${readOnlyDescription}` : description}
        actionProps={
          data.canManage
            ? {
                primary: {
                  children: i18n.translate(
                    'xpack.nightshift.detectionPage.runLimitsBanner.manageButtonLabel',
                    {
                      defaultMessage: 'Review run limits',
                    }
                  ),
                  href: application.getUrlForApp(NIGHTSHIFT_APP_ID, {
                    path: `/settings/${getRunQuotaSettingsTab(exhaustedGroups)}`,
                  }),
                  'data-test-subj': 'nightshiftDetectionRunLimitsBannerReviewButton',
                },
              }
            : undefined
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
