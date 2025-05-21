/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadPage } from '../../tasks/common';

export const navigateToFleetAgentPolicySettings = (policyId: string) => {
  loadPage(`/app/fleet/policies/${policyId}/settings`);
};

export const checkForAgentTamperProtectionAvailability = (
  isAgentTamperProtectionEnabled = true
) => {
  const upsellElementVisibility = isAgentTamperProtectionEnabled ? 'not.exist' : 'exist';
  const componentElementVisibility = isAgentTamperProtectionEnabled ? 'exist' : 'not.exist';

  cy.getByTestSubj('endpointSecurity-agentTamperProtectionLockedCard-badge').should(
    upsellElementVisibility
  );
  cy.getByTestSubj('endpointSecurity-agentTamperProtectionLockedCard-title').should(
    upsellElementVisibility
  );
  cy.getByTestSubj('endpointPolicy-agentTamperProtectionLockedCard').should(
    upsellElementVisibility
  );

  cy.getByTestSubj('tamperProtectionSwitch').should(componentElementVisibility);
  cy.getByTestSubj('tamperMissingIntegrationTooltip').should('not.exist');
  cy.getByTestSubj('uninstallCommandLink').should(componentElementVisibility);
};
