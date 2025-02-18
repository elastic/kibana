/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  showEmptyPrompt,
  showFailurePrompt,
  showNoAlertsPrompt,
  showWelcomePrompt,
} from '../../../../helpers';

export const showEmptyStates = ({
  aiConnectorsCount,
  alertsContextCount,
  attackDiscoveriesCount,
  connectorId,
  failureReason,
  isLoading,
}: {
  aiConnectorsCount: number | null;
  alertsContextCount: number | null;
  attackDiscoveriesCount: number;
  connectorId: string | undefined;
  failureReason: string | null;
  isLoading: boolean;
}): boolean => {
  const showWelcome = showWelcomePrompt({ aiConnectorsCount, isLoading });
  const showFailure = showFailurePrompt({ connectorId, failureReason, isLoading });
  const showNoAlerts = showNoAlertsPrompt({ alertsContextCount, connectorId, isLoading });
  const showEmpty = showEmptyPrompt({ aiConnectorsCount, attackDiscoveriesCount, isLoading });

  return showWelcome || showFailure || showNoAlerts || showEmpty;
};
