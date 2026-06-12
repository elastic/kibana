/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { IntegrationIcon as Icon } from '../../../detections/components/alert_summary/common/integration_icon';
import { useFetchIntegrations } from '../../../detections/hooks/alert_summary/use_fetch_integrations';

export const INTEGRATION_TEST_ID = 'alert-summary-flyout';

interface IntegrationIconProps {
  /**
   *
   */
  integrationName: string;
}

/**
 * Renders the icon for the integration that matches the rule id.
 * It fetches all the packages (integrations) to find the matching integration name.
 * In EASE, we can retrieve the integration/package via the kibana.rule.parameters field on the alert.
 */
export const IntegrationIcon = memo(({ integrationName }: IntegrationIconProps) => {
  const { installedPackages, isLoading: integrationIsLoading } = useFetchIntegrations();
  const integration = installedPackages.find((p) => integrationName === p.name);

  return (
    <Icon
      data-test-subj={INTEGRATION_TEST_ID}
      iconSize="l"
      integration={integration}
      isLoading={integrationIsLoading}
    />
  );
});

IntegrationIcon.displayName = 'IntegrationIcon';
