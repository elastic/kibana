/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../../utils/kibana_react';
import { DashboardTiles } from './related_dashboards/dashboard_tiles';
import { useRelatedDashboards } from '../hooks/use_related_dashboards';
import { DashboardMetadata } from './related_dashboards/dashboard_tile';
import { useAddSuggestedDashboards } from '../hooks/use_add_suggested_dashboard';

interface RelatedDashboardsProps {
  alertId: string;
  relatedDashboards?: Array<{ id: string }>;
  rule: Rule;
  onAddLinkedDashboard: () => void;
}

export function RelatedDashboards({
  alertId,
  relatedDashboards,
  rule,
  onAddLinkedDashboard,
}: RelatedDashboardsProps) {
  const [dashboardsMeta, setDashboardsMeta] = useState<DashboardMetadata[]>([]);
  const [isLoadingLinkedDashboards, setIsLoadingLinkedDashboards] = useState(true);
  const { isLoadingRelatedDashboards, suggestedDashboards } = useRelatedDashboards(alertId);
  const {
    services: { dashboard: dashboardService },
  } = useKibana();

  // On success add the dashboard to the local linked dashboards to update the UI
  const onSuccessAddSuggestedDashboard = (addedDashboardId: string) => {
    const suggestedDashboard = suggestedDashboards?.find(({ id }) => id === addedDashboardId);
    if (!suggestedDashboard) throw Error('Suggested dashboard not found, this should never happen');
    setDashboardsMeta((value) => [...value, suggestedDashboard]);
    onAddLinkedDashboard();
  };

  const { onClickAddSuggestedDashboard, addingDashboardId } = useAddSuggestedDashboards({
    rule,
    onSuccessAddSuggestedDashboard,
  });

  useEffect(() => {
    if (!relatedDashboards || !dashboardService) {
      return;
    }

    const fetchDashboards = async () => {
      const dashboardPromises = relatedDashboards.map(async (dashboard) => {
        try {
          const findDashboardsService = await dashboardService.findDashboardsService();
          const response = await findDashboardsService.findById(dashboard.id);

          if (response.status === 'error') {
            return null;
          }

          return {
            id: dashboard.id,
            title: response.attributes.title,
            description: response.attributes.description,
          };
        } catch (dashboardError) {
          return null;
        }
      });

      const results = await Promise.all(dashboardPromises);

      // Filter out null results (failed dashboard fetches)
      const validDashboards = results.filter(Boolean) as Array<{
        id: string;
        title: string;
        description: string;
      }>;

      setDashboardsMeta(validDashboards);
      setIsLoadingLinkedDashboards(false);
    };

    fetchDashboards();
  }, [relatedDashboards, dashboardService, setDashboardsMeta]);

  const isLoading = isLoadingLinkedDashboards || isLoadingRelatedDashboards;

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
        isLoadingDashboards={isLoading}
        dashboards={dashboardsMeta}
        dataTestSubj="linked-dashboards"
      />
      <DashboardTiles
        title={i18n.translate('xpack.observability.alertDetails.suggestedDashboards', {
          defaultMessage: 'Suggested dashboards',
        })}
        isLoadingDashboards={isLoading}
        dashboards={suggestedDashboardsWithButton}
        dataTestSubj="suggested-dashboards"
      />
    </div>
  );
}
