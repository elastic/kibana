/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { OnboardingCardCheckComplete } from '../../../../../types';
import { loadAiConnectors } from '../../common/connectors/ai_connectors';
import { getConnectorsAuthz } from '../../common/connectors/authz';
import type { AIConnectorCardMetadata } from './types';

const completeBadgeText = (count: number) =>
  i18n.translate('xpack.securitySolution.onboarding.llmConnector.badge.completeText', {
    defaultMessage: '{count} AI {count, plural, one {connector} other {connectors}} added',
    values: { count },
  });

export const checkAiConnectorsCardComplete: OnboardingCardCheckComplete<
  AIConnectorCardMetadata
> = async ({ http, application }) => {
  const authz = getConnectorsAuthz(application.capabilities);

  if (!authz.canReadConnectors) {
    return { isComplete: false, metadata: { connectors: [], ...authz } };
  }

  const aiConnectors = await loadAiConnectors(http);

  return {
    isComplete: aiConnectors.length > 0,
    completeBadgeText: completeBadgeText(aiConnectors.length),
    metadata: { connectors: aiConnectors, ...authz },
  };
};
