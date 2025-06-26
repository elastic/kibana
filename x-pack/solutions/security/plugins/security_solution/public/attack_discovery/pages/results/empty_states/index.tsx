/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Failure } from './failure';
import { EmptyPrompt } from './empty_prompt';
import { showFailurePrompt, showNoAlertsPrompt, showWelcomePrompt } from '../../helpers';
import { NoAlerts } from './no_alerts';
import { Welcome } from './welcome';

interface Props {
  aiConnectorsCount: number | null; // null when connectors are not configured
  alertsContextCount: number | null; // null when unavailable for the current connector
  attackDiscoveriesCount: number;
  connectorId: string | undefined;
  failureReason: string | null;
  isLoading: boolean;
  onGenerate: () => Promise<void>;
  upToAlertsCount: number;
}

const EmptyStatesComponent: React.FC<Props> = ({
  aiConnectorsCount,
  alertsContextCount,
  attackDiscoveriesCount,
  connectorId,
  failureReason,
  isLoading,
  onGenerate,
  upToAlertsCount,
}) => {
  const isDisabled = connectorId == null;

  if (showWelcomePrompt({ aiConnectorsCount, isLoading })) {
    return <Welcome />;
  }

  if (showFailurePrompt({ connectorId, failureReason, isLoading })) {
    return <Failure failureReason={failureReason} />;
  }

  if (showNoAlertsPrompt({ alertsContextCount, connectorId, isLoading })) {
    return <NoAlerts isLoading={isLoading} isDisabled={isDisabled} onGenerate={onGenerate} />;
  }

  return (
    <EmptyPrompt
      aiConnectorsCount={aiConnectorsCount}
      alertsCount={upToAlertsCount}
      attackDiscoveriesCount={attackDiscoveriesCount}
      isDisabled={isDisabled}
      isLoading={isLoading}
      onGenerate={onGenerate}
    />
  );
};

export const EmptyStates = React.memo(EmptyStatesComponent);
