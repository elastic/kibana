/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataStream, PackageListItem } from '@kbn/fleet-plugin/common';
import { useGetDataStreams } from '@kbn/fleet-plugin/public';
import { IntegrationBadge } from './integration_badge';
import { ADD_INTEGRATION } from './translations';
import { useAddIntegrationsUrl } from '../../../../common/hooks/use_add_integrations_url';

export interface IntegrationSectionProps {
  /**
   *
   */
  packages: PackageListItem[];
}

/**
 *
 */
export const IntegrationSection = memo(({ packages }: IntegrationSectionProps) => {
  const { onClick: addIntegration } = useAddIntegrationsUrl();

  //
  const { isLoading, data } = useGetDataStreams();
  const lastActivitiesMap: { [id: string]: number } = useMemo(() => {
    const la: { [id: string]: number } = {};
    packages.forEach((p: PackageListItem) => {
      const dataStreams = (data?.data_streams || []).filter(
        (d: DataStream) => d.package === p.name
      );
      dataStreams.sort((a, b) => a.last_activity_ms - b.last_activity_ms);
      const lastActivity = dataStreams.shift();

      if (lastActivity) {
        la[p.name] = lastActivity.last_activity_ms;
      }
    });
    return la;
  }, [data, packages]);

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center">
      {packages.map((pkg) => (
        <EuiFlexItem grow={false}>
          <IntegrationBadge
            integration={pkg}
            isLoading={isLoading}
            lastActivity={lastActivitiesMap[pkg.name]}
          />
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={addIntegration} iconType="plusInCircle">
          {ADD_INTEGRATION}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

IntegrationSection.displayName = 'IntegrationSection';
