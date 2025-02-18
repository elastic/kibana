/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { RelatedIntegrationArray } from '../../../../../common/api/detection_engine/model/rule_schema';
import type { IntegrationDetails } from './integration_details';
import { calculateIntegrationDetails } from './integration_details';
import { useIntegrations } from './use_integrations';

export interface UseRelatedIntegrationsResult {
  integrations: IntegrationDetails[];
  isLoaded: boolean;
}

export const useRelatedIntegrations = (
  relatedIntegrations: RelatedIntegrationArray
): UseRelatedIntegrationsResult => {
  const { data: integrations } = useIntegrations();

  return useMemo(() => {
    const integrationDetails = calculateIntegrationDetails(relatedIntegrations, integrations);

    return {
      integrations: integrationDetails,
      isLoaded: integrations != null,
    };
  }, [relatedIntegrations, integrations]);
};
