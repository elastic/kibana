/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';
import { IntegrationBadge } from './integration_badge';
import { ADD_INTEGRATION } from './translations';
import { useAddIntegrationsUrl } from '../../../../common/hooks/use_add_integrations_url';

export interface IntegrationSectionProps {
  /**
   *
   */
  packages: CustomIntegration[] | PackageListItem[];
}

/**
 *
 */
export const IntegrationSection = memo(({ packages }: IntegrationSectionProps) => {
  const { onClick: addIntegration } = useAddIntegrationsUrl();

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center">
      {packages.map((pkg) => (
        <EuiFlexItem grow={false}>
          <IntegrationBadge integration={pkg} />
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
