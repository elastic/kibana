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
import type { RunQuotaGroup } from '@kbn/significant-events-plugin/common';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../common/ebt_constants';
import { useKibana } from '../../hooks/use_kibana';
import { isFiniteRunLimit, type RunLimitDraft } from './run_limit_draft';

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
  const { application } = useKibana().services;
  const automationsHref = application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/automations' });
  const exhaustedGroups = enabled
    ? groups.filter((group) => isFiniteRunLimit(limits[group]) && counts[group] >= limits[group])
    : [];

  if (exhaustedGroups.length === 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer />
      <KbnWarningCallout
        announceOnMount
        size="s"
        data-test-subj="nightshiftRunLimitsBanner"
        title={i18n.translate('xpack.nightshift.settings.runLimits.exhaustionTitle', {
          defaultMessage: 'Scheduled automations reached a daily run limit',
        })}
        text={i18n.translate('xpack.nightshift.settings.runLimits.exhaustionDescription', {
          defaultMessage:
            'New scheduled runs are skipped until the limit resets at midnight (UTC). Manual runs are not limited.',
        })}
        actionProps={{
          primary: {
            children: i18n.translate('xpack.nightshift.settings.runLimits.openAutomationsButton', {
              defaultMessage: 'Open automations',
            }),
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
        }}
      />
      <EuiSpacer />
    </>
  );
};
