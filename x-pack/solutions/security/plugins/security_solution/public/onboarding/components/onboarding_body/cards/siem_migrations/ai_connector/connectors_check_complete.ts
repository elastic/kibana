/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import { CapabilitiesChecker } from '../../../../../../common/lib/capabilities/capabilities_checker';
import type { OnboardingCardCheckComplete } from '../../../../../types';
import { AIActionTypeIds } from '../../common/connectors/constants';
import type { AIConnectorCardMetadata } from './types';

export const checkAiConnectorsCardComplete: OnboardingCardCheckComplete<
  AIConnectorCardMetadata
> = async ({ http, application, siemMigrations }) => {
  let isComplete = false;
  const capabilities = new CapabilitiesChecker(application.capabilities);

  const canExecuteConnectors = capabilities.has([['actions.show', 'actions.execute']]);
  const canCreateConnectors = capabilities.has('actions.save');

  if (!capabilities.has('actions.show')) {
    return { isComplete, metadata: { connectors: [], canExecuteConnectors, canCreateConnectors } };
  }

  const allConnectors = await loadConnectors({ http });

  const connectors = allConnectors.reduce<AIConnector[]>((acc, connector) => {
    if (!connector.isMissingSecrets && AIActionTypeIds.includes(connector.actionTypeId)) {
      acc.push(connector);
    }
    return acc;
  }, []);

  const storedConnectorId = siemMigrations.rules.connectorIdStorage.get();
  if (storedConnectorId) {
    if (connectors.length === 0) {
      siemMigrations.rules.connectorIdStorage.remove();
    } else {
      isComplete = connectors.some((connector) => connector.id === storedConnectorId);
    }
  }

  return { isComplete, metadata: { connectors, canExecuteConnectors, canCreateConnectors } };
};
