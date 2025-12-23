/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@kbn/react-query';
import type { FleetPackage } from './types';

export const useDetectionRulesByIntegration = (integrationPackages: string | string[]) => {
  const { http } = useKibana<CoreStart>().services;

  return useQuery({
    queryKey: ['detection-rules-by-integration', integrationPackages] as const,
    queryFn: () => {
      return http.get<{ data: FleetPackage[] }>('/api/detection_engine/rules/_find', {
        query: {
          filter: 'alert.attributes.enabled:true',
          per_page: 10000,
        },
      });
    },
    select: (data: { data: FleetPackage[] }) => {
      // Convert installed integrations to Set for O(1) lookups
      const installedPackagesSet = new Set(
        Array.isArray(integrationPackages) ? integrationPackages : [integrationPackages]
      );

      // Convert back to array for return value
      const installedIntegrations = Array.from(installedPackagesSet);

      // Collect all unique integration packages required by enabled rules
      const requiredIntegrations = new Set<string>();
      const rulesWithIntegrations: FleetPackage[] = [];
      const rulesWithoutIntegrations: FleetPackage[] = [];

      data.data?.forEach((rule: FleetPackage) => {
        let hasInstalledIntegration = false;

        // Check if rule has any related integrations
        if (rule.related_integrations && rule.related_integrations.length > 0) {
          rule.related_integrations.forEach((integration) => {
            if (integration.package) {
              requiredIntegrations.add(integration.package);

              if (installedPackagesSet.has(integration.package)) {
                hasInstalledIntegration = true;
              }
            }
          });

          // Categorize rules based on whether they have installed integrations
          if (hasInstalledIntegration) {
            rulesWithIntegrations.push(rule);
          } else {
            rulesWithoutIntegrations.push(rule);
          }
        } else {
          // Rules with no related integrations are considered as having coverage
          rulesWithIntegrations.push(rule);
        }
      });

      // Find integrations that are required but not installed
      const missingIntegrations = Array.from(requiredIntegrations).filter(
        (packageName) => !installedPackagesSet.has(packageName)
      );

      return {
        // Existing return value (for backward compatibility)
        data: rulesWithIntegrations,

        // Enhanced analytics
        analytics: {
          rulesWithIntegrations,
          rulesWithoutIntegrations,
          missingIntegrations,
          installedIntegrations,
        },
      };
    },
  });
};
