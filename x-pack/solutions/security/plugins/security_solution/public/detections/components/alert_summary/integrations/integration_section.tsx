/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { useIntegrationsLastActivity } from '../../../hooks/alert_summary/use_integrations_last_activity';
import { IntegrationCard } from './integration_card';
import { useNavigateToIntegrationsPage } from '../../../hooks/alert_summary/use_navigate_to_integrations_page';

const ADD_INTEGRATION = i18n.translate(
  'xpack.securitySolution.alertSummary.integrations.addIntegrationButtonLabel',
  {
    defaultMessage: 'Add integration',
  }
);

export const CARD_TEST_ID = 'alert-summary-integration-card-';
export const ADD_INTEGRATIONS_BUTTON_TEST_ID = 'alert-summary-add-integrations-button';

export interface IntegrationSectionProps {
  /**
   * List of installed AI for SOC integrations
   */
  packages: PackageListItem[];
}

/**
 * Section rendered at the top of the alert summary page. It displays all the AI for SOC installed integrations
 * and allow the user to add more integrations by clicking on a button that links to a Fleet page.
 * Each integration card is also displaying the last time the sync happened (using streams).
 */
export const IntegrationSection = memo(({ packages }: IntegrationSectionProps) => {
  const navigateToIntegrationsPage = useNavigateToIntegrationsPage();
  const { isLoading, lastActivities } = useIntegrationsLastActivity({ packages });

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
          {packages.map((pkg) => (
            <EuiFlexItem grow={false} key={pkg.name}>
              <IntegrationCard
                data-test-subj={`${CARD_TEST_ID}${pkg.name}`}
                integration={pkg}
                isLoading={isLoading}
                lastActivity={lastActivities[pkg.name]}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj={ADD_INTEGRATIONS_BUTTON_TEST_ID}
          iconType="plusInCircle"
          onClick={navigateToIntegrationsPage}
        >
          {ADD_INTEGRATION}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

IntegrationSection.displayName = 'IntegrationSection';
