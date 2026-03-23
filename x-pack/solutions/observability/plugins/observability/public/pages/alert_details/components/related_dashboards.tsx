/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { LinkedDashboard, SuggestedDashboard } from '@kbn/observability-schema';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import { DashboardTiles } from './related_dashboards/dashboard_tiles';
import { useAddSuggestedDashboards } from '../hooks/use_add_suggested_dashboard';

interface RelatedDashboardsProps {
  rule: Rule;
  suggestedDashboards?: SuggestedDashboard[];
  linkedDashboards?: LinkedDashboard[];
  isLoadingRelatedDashboards: boolean;
  onSuccessAddSuggestedDashboard: () => Promise<void>;
  timeRange: NonNullable<DashboardLocatorParams['time_range']>;
}

export function RelatedDashboards({
  rule,
  isLoadingRelatedDashboards,
  linkedDashboards,
  suggestedDashboards,
  onSuccessAddSuggestedDashboard,
  timeRange,
}: RelatedDashboardsProps) {
  const { onClickAddSuggestedDashboard, addingDashboardId } = useAddSuggestedDashboards({
    rule,
    onSuccessAddSuggestedDashboard,
  });

  const suggestedDashboardsWithButton = useMemo(
    () =>
      suggestedDashboards?.map((d) => {
        const ruleType = rule.ruleTypeId.split('.').pop();
        return {
          ...d,
          actionButtonProps: {
            isDisabled: addingDashboardId !== undefined && addingDashboardId !== d.id,
            isLoading: addingDashboardId === d.id,
            label: i18n.translate(
              'xpack.observability.alertDetails.suggestedDashboards.buttonLabel',
              {
                defaultMessage: 'Add to linked dashboards',
              }
            ),
            onClick: onClickAddSuggestedDashboard,
            ruleType: ruleType || 'unknown',
          },
        };
      }),
    [addingDashboardId, onClickAddSuggestedDashboard, rule.ruleTypeId, suggestedDashboards]
  );

  return (
    <div data-test-subj="alertRelatedDashboards">
      <DashboardTiles
        title={i18n.translate('xpack.observability.alertDetails.linkedDashboards', {
          defaultMessage: 'Linked dashboards',
        })}
        isLoadingDashboards={isLoadingRelatedDashboards}
        dashboards={linkedDashboards}
        dataTestSubj="linked-dashboards"
        timeRange={timeRange}
      />
      <DashboardTiles
        title={i18n.translate('xpack.observability.alertDetails.suggestedDashboards', {
          defaultMessage: 'Suggested dashboards',
        })}
        isLoadingDashboards={isLoadingRelatedDashboards}
        dashboards={suggestedDashboardsWithButton}
        dataTestSubj="suggested-dashboards"
        timeRange={timeRange}
      />
    </div>
  );
}
