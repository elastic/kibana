/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { DashboardTiles } from './related_dashboards/dashboard_tiles';
import { DashboardMetadata } from './related_dashboards/dashboard_tile';
import { useAddSuggestedDashboards } from '../hooks/use_add_suggested_dashboard';

interface RelatedDashboardsProps {
  rule: Rule;
  suggestedDashboards?: DashboardMetadata[];
  linkedDashboards?: DashboardMetadata[];
  isLoadingRelatedDashboards: boolean;
}

export function RelatedDashboards({
  rule,
  isLoadingRelatedDashboards,
  linkedDashboards,
  suggestedDashboards,
}: RelatedDashboardsProps) {
  // On success add the dashboard to the local linked dashboards to update the UI

  const { onClickAddSuggestedDashboard, addingDashboardId } = useAddSuggestedDashboards({
    rule,
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
    <div>
      <DashboardTiles
        title={i18n.translate('xpack.observability.alertDetails.relatedDashboards', {
          defaultMessage: 'Linked dashboards',
        })}
        isLoadingDashboards={isLoadingRelatedDashboards}
        dashboards={linkedDashboards}
        dataTestSubj="linked-dashboards"
      />
      <DashboardTiles
        title={i18n.translate('xpack.observability.alertDetails.suggestedDashboards', {
          defaultMessage: 'Suggested dashboards',
        })}
        isLoadingDashboards={isLoadingRelatedDashboards}
        dashboards={suggestedDashboardsWithButton}
        dataTestSubj="suggested-dashboards"
      />
    </div>
  );
}
