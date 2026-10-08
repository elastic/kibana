/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RunQuotaGroup } from '@kbn/significant-events-plugin/common';
import { isFiniteRunLimit, type RunLimitDraft } from './run_limit_draft';
import { RUN_QUOTA_GROUP_LABELS } from './run_limit_row';

export const RunQuotaExhaustionCallout = ({
  enabled,
  limits,
  counts,
  groups,
}: {
  enabled: boolean;
  limits: Record<RunQuotaGroup, RunLimitDraft>;
  counts: Record<RunQuotaGroup, number>;
  groups: readonly RunQuotaGroup[];
}) => {
  const exhaustedGroups = enabled
    ? groups.filter((group) => isFiniteRunLimit(limits[group]) && counts[group] >= limits[group])
    : [];

  if (exhaustedGroups.length === 0) {
    return null;
  }

  const reached = i18n.formatList(
    'conjunction',
    exhaustedGroups.map((group) =>
      i18n.translate('xpack.nightshift.settings.runLimits.reachedGroupDetail', {
        defaultMessage: '{group}: {count} counted scheduled admissions, daily limit {limit}',
        values: {
          group: RUN_QUOTA_GROUP_LABELS[group],
          count: counts[group],
          limit: limits[group],
        },
      })
    )
  );

  return (
    <>
      <EuiSpacer />
      <EuiCallOut
        announceOnMount
        size="s"
        color="warning"
        iconType="warning"
        data-test-subj="nightshiftRunLimitsBanner"
        title={i18n.translate('xpack.nightshift.settings.runLimits.exhaustionTitle', {
          defaultMessage: 'Scheduled automation has reached a daily run limit',
        })}
      >
        <p>
          {i18n.translate('xpack.nightshift.settings.runLimits.exhaustionDescription', {
            defaultMessage:
              'Reached limits: {reached}. New scheduled admissions in these categories can be denied until the UTC day resets. Manual runs are not limited.',
            values: { reached },
          })}
        </p>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
