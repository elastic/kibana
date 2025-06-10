/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../utils/kibana_react';
import { Dashboards } from './related_dashboards/dashboards';
import { useSuggestedDashboards } from '../hooks/use_suggested_dashboards';

interface RelatedDashboardsProps {
  alertId: string;
  relatedDashboards: Array<{ id: string }>;
}

export function RelatedDashboards({ alertId, relatedDashboards }: RelatedDashboardsProps) {
  const [dashboardsMeta, setDashboardsMeta] = useState<
    Array<{ id: string; title: string; description: string }>
  >([]);
  const [isLoadingLinkedDashboards, setIsLoadingLinkedDashboards] = useState(true);

  const { isLoadingSuggestedDashboards, suggestedDashboards } = useSuggestedDashboards(alertId);

  const isLoading = isLoadingLinkedDashboards || isLoadingSuggestedDashboards;

  // Filter out suggested dashboards that are already in dashboardsMeta
  const filteredSuggestedDashboards = useMemo(
    () =>
      suggestedDashboards
        ? suggestedDashboards.filter(
            (suggestedDashboard) =>
              !dashboardsMeta.some((dashboard) => dashboard.id === suggestedDashboard.id)
          )
        : [],
    [dashboardsMeta, suggestedDashboards]
  );

  const {
    services: { dashboard: dashboardService },
  } = useKibana();

  useEffect(() => {
    if (!relatedDashboards?.length || !dashboardService) {
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

  return (
    <div>
      <Dashboards
        title={i18n.translate('xpack.observability.alertDetails.relatedDashboards', {
          defaultMessage: 'Linked dashboards',
        })}
        isLoadingDashboards={isLoading}
        dashboards={dashboardsMeta}
      />
      <Dashboards
        title={i18n.translate('xpack.observability.alertDetails.suggestedDashboards', {
          defaultMessage: 'Suggested dashboards',
        })}
        isLoadingDashboards={isLoading}
        dashboards={filteredSuggestedDashboards}
      />
    </div>
  );
}
