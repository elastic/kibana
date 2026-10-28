/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isRunQuotaReached, type RunQuotaGroup } from '@kbn/significant-events-plugin/common';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useBlocksNewActivity } from '../../data/maintenance/use_significant_events_maintenance';
import { useRunQuotas } from '../../data/run_quotas/use_significant_events_run_quotas';

export type DetectionRunQuotaGroup = Extract<RunQuotaGroup, 'detection' | 'ki_extraction'>;

export const isDetectionRunQuotaGroup = (group: RunQuotaGroup): group is DetectionRunQuotaGroup =>
  group === 'detection' || group === 'ki_extraction';

const getCalloutTitle = (group: DetectionRunQuotaGroup): string =>
  group === 'detection'
    ? i18n.translate('xpack.nightshift.runQuotaReachedCallout.discoveryTitle', {
        defaultMessage: 'Discovery reached daily run limit for this deployment',
      })
    : i18n.translate('xpack.nightshift.runQuotaReachedCallout.knowledgeIndicatorExtractionTitle', {
        defaultMessage:
          'Knowledge indicators extraction reached daily run limit for this deployment',
      });

export const RunQuotaReachedCallout = ({
  group,
}: {
  group: DetectionRunQuotaGroup;
}): React.ReactElement => (
  <KbnWarningCallout
    announceOnMount
    size="s"
    data-test-subj={`nightshiftRunQuotaReached-${group}`}
    title={getCalloutTitle(group)}
    text={i18n.translate('xpack.nightshift.runQuotaReachedCallout.manualRunDescription', {
      defaultMessage:
        'Further scheduled runs will be paused until the limit resets at midnight (UTC). You can still trigger discovery process manually.',
    })}
  />
);

export const RunQuotaReachedBanner = ({
  group,
}: {
  group: DetectionRunQuotaGroup;
}): React.ReactElement | null => {
  const { data } = useRunQuotas();
  const { isBlocked } = useBlocksNewActivity();

  if (
    isBlocked ||
    !data ||
    !isRunQuotaReached({
      enabled: data.enabled,
      limit: data.limits[group],
      count: data.counts[group],
    })
  ) {
    return null;
  }

  return (
    <>
      <RunQuotaReachedCallout group={group} />
      <EuiSpacer size="m" />
    </>
  );
};
