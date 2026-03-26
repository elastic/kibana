/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loadConnectors } from '@kbn/inference-connectors';
import type { OnboardingCardCheckComplete } from '../../../../../types';
import { getConnectorsAuthz } from '../../common/connectors/authz';
import type { AIConnectorCardMetadata } from './types';

export const checkAiConnectorsCardComplete: OnboardingCardCheckComplete<
  AIConnectorCardMetadata
> = async ({ http, application, siemMigrations, settings }) => {
  let isComplete = false;
  const authz = getConnectorsAuthz(application.capabilities);

  if (!authz.canReadConnectors) {
    return { isComplete, metadata: { connectors: [], ...authz } };
  }

  const aiConnectors = await loadConnectors({
    http,
    featureId: 'siem_migrations',
    settings,
  });

  const storedConnectorId = siemMigrations.rules.connectorIdStorage.get();
  if (storedConnectorId) {
    if (aiConnectors.length === 0) {
      siemMigrations.rules.connectorIdStorage.remove();
    } else {
      isComplete = aiConnectors.some((connector) => connector.id === storedConnectorId);
    }
  }

  return { isComplete, metadata: { connectors: aiConnectors, ...authz } };
};
