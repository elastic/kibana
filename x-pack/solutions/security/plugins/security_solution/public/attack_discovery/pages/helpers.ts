/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getInitialIsOpen = (index: number) => index < 3;

interface ErrorWithStringMessage {
  body?: {
    error?: string;
    message?: string;
    statusCode?: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isErrorWithStringMessage(error: any): error is ErrorWithStringMessage {
  const errorBodyError = error.body?.error;
  const errorBodyMessage = error.body?.message;
  const errorBodyStatusCode = error.body?.statusCode;

  return (
    typeof errorBodyError === 'string' &&
    typeof errorBodyMessage === 'string' &&
    typeof errorBodyStatusCode === 'number'
  );
}

interface ErrorWithStructuredMessage {
  body?: {
    message?: {
      error?: string;
    };
    status_code?: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isErrorWithStructuredMessage(error: any): error is ErrorWithStructuredMessage {
  const errorBodyMessageError = error.body?.message?.error;
  const errorBodyStatusCode = error.body?.status_code;

  return typeof errorBodyMessageError === 'string' && typeof errorBodyStatusCode === 'number';
}

export const CONNECTOR_ID_LOCAL_STORAGE_KEY = 'connectorId';

export const getErrorToastText = (
  error: ErrorWithStringMessage | ErrorWithStructuredMessage | unknown
): string => {
  if (isErrorWithStringMessage(error)) {
    return `${error.body?.error} (${error.body?.statusCode}) ${error.body?.message}`;
  } else if (isErrorWithStructuredMessage(error)) {
    return `(${error.body?.status_code}) ${error.body?.message?.error}`;
  } else if (
    typeof error === 'object' &&
    error != null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  } else {
    return `${error}`;
  }
};

export const showNoAlertsPrompt = ({
  alertsContextCount,
  connectorId,
  isLoading,
}: {
  alertsContextCount: number | null;
  connectorId: string | undefined;
  isLoading: boolean;
}): boolean =>
  connectorId != null && !isLoading && alertsContextCount != null && alertsContextCount === 0;

export const showWelcomePrompt = ({
  aiConnectorsCount,
  isLoading,
}: {
  aiConnectorsCount: number | null;
  isLoading: boolean;
}): boolean => !isLoading && aiConnectorsCount != null && aiConnectorsCount === 0;

export const showEmptyPrompt = ({
  aiConnectorsCount,
  attackDiscoveriesCount,
  isLoading,
}: {
  aiConnectorsCount: number | null;
  attackDiscoveriesCount: number;
  isLoading: boolean;
}): boolean => !isLoading && aiConnectorsCount != null && attackDiscoveriesCount === 0;

export const showLoading = ({
  connectorId,
  attackDiscoveriesCount,
  isLoading,
  loadingConnectorId,
}: {
  connectorId: string | undefined;
  attackDiscoveriesCount: number;
  isLoading: boolean;
  loadingConnectorId: string | null;
}): boolean => isLoading && (loadingConnectorId === connectorId || attackDiscoveriesCount === 0);

export const showSummary = (attackDiscoveriesCount: number) => attackDiscoveriesCount > 0;

export const showFailurePrompt = ({
  connectorId,
  failureReason,
  isLoading,
}: {
  connectorId: string | undefined;
  failureReason: string | null;
  isLoading: boolean;
}): boolean => connectorId != null && !isLoading && failureReason != null;

export const getSize = ({
  defaultMaxAlerts,
  localStorageAttackDiscoveryMaxAlerts,
}: {
  defaultMaxAlerts: number;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
}): number => {
  const size = Number(localStorageAttackDiscoveryMaxAlerts);

  return isNaN(size) || size <= 0 ? defaultMaxAlerts : size;
};
