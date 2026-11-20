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
import { isRunQuotaReached, type RunQuotaGroup } from '@kbn/significant-events-plugin/common';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../common/ebt_constants';
import { useBlocksNewActivity } from '../../data/maintenance/use_significant_events_maintenance';
import { useRunQuotas } from '../../data/run_quotas/use_significant_events_run_quotas';
import { useKibana } from '../../hooks/use_kibana';

export type DetectionRunQuotaGroup = Extract<RunQuotaGroup, 'detection' | 'ki_extraction'>;

export const isDetectionRunQuotaGroup = (group: RunQuotaGroup): group is DetectionRunQuotaGroup =>
  group === 'detection' || group === 'ki_extraction';

const getCalloutTitle = (group: DetectionRunQuotaGroup, limit: number): string =>
  group === 'detection'
    ? i18n.translate('xpack.nightshift.runQuotaReachedCallout.discoveryTitle', {
        defaultMessage: 'Discovery reached daily run limit of {limit} for this deployment',
        values: { limit },
      })
    : i18n.translate('xpack.nightshift.runQuotaReachedCallout.knowledgeIndicatorExtractionTitle', {
        defaultMessage:
          'Knowledge indicators extraction reached daily run limit of {limit} for this deployment',
        values: { limit },
      });

// Only Discovery has a back link from settings; the Knowledge page has none.
const SETTINGS_PATH: Record<DetectionRunQuotaGroup, string> = {
  detection: '/settings/detections?origin=detections',
  ki_extraction: '/settings/detections',
};

export const RunQuotaReachedCallout = ({
  group,
  limit,
  settingsHref,
}: {
  group: DetectionRunQuotaGroup;
  limit: number;
  settingsHref?: string;
}): React.ReactElement => (
  <KbnWarningCallout
    announceOnMount
    size="s"
    data-test-subj={`nightshiftRunQuotaReached-${group}`}
    title={getCalloutTitle(group, limit)}
    text={i18n.translate('xpack.nightshift.runQuotaReachedCallout.manualRunDescription', {
      defaultMessage:
        'Further scheduled runs will be paused until the limit resets at midnight (UTC). You can still trigger discovery process manually.',
    })}
    actionProps={
      settingsHref
        ? {
            primary: {
              children: i18n.translate('xpack.nightshift.runQuotaReachedCallout.goToSettings', {
                defaultMessage: 'Open settings',
              }),
              href: settingsHref,
              'data-test-subj': `nightshiftRunQuotaReachedSettingsLink-${group}`,
              ...getEbtProps({
                action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SETTINGS,
                element: NIGHTSHIFT_EBT_ELEMENTS.RUN_QUOTA_REACHED_CALLOUT,
              }),
            },
          }
        : undefined
    }
  />
);

export const RunQuotaReachedBanner = ({
  group,
}: {
  group: DetectionRunQuotaGroup;
}): React.ReactElement | null => {
  const { data } = useRunQuotas();
  const { isBlocked } = useBlocksNewActivity();
  const { application } = useKibana().services;

  if (
    isBlocked ||
    !data ||
    !isRunQuotaReached({
      group,
      enabled: data.enabled,
      limit: data.limits[group],
      count: data.counts[group],
    })
  ) {
    return null;
  }

  return (
    <>
      <RunQuotaReachedCallout
        group={group}
        limit={data.limits[group]}
        settingsHref={
          data.canManage
            ? application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: SETTINGS_PATH[group] })
            : undefined
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
