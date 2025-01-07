/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import type { HttpHandler } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import { PartialTheme, Theme } from '@elastic/charts';

import { EuiComboBoxOptionOption } from '@elastic/eui';
import type { TelemetryEvents } from '../types';

export interface DataQualityProviderProps {
  httpFetch: HttpHandler;
  isILMAvailable: boolean;
  telemetryEvents: TelemetryEvents;
  toasts: IToasts;
  addSuccessToast: (toast: { title: string }) => void;
  baseTheme: Theme;
  canUserCreateAndReadCases: () => boolean;
  endDate?: string | null;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  isAssistantEnabled: boolean;
  lastChecked: string;
  openCreateCaseFlyout: ({
    comments,
    headerContent,
  }: {
    comments: string[];
    headerContent?: React.ReactNode;
  }) => void;
  patterns: string[];
  setLastChecked: (lastChecked: string) => void;
  startDate?: string | null;
  theme?: PartialTheme;
  ilmPhases: string[];
  selectedIlmPhaseOptions: EuiComboBoxOptionOption[];
  setSelectedIlmPhaseOptions: (options: EuiComboBoxOptionOption[]) => void;
  defaultStartTime: string;
  defaultEndTime: string;
}

const DataQualityContext = React.createContext<DataQualityProviderProps | undefined>(undefined);

export const DataQualityProvider: React.FC<PropsWithChildren<DataQualityProviderProps>> = ({
  children,
  httpFetch,
  toasts,
  isILMAvailable,
  telemetryEvents,
  addSuccessToast,
  canUserCreateAndReadCases,
  endDate,
  formatBytes,
  formatNumber,
  isAssistantEnabled,
  lastChecked,
  openCreateCaseFlyout,
  patterns,
  setLastChecked,
  startDate,
  theme,
  baseTheme,
  ilmPhases,
  selectedIlmPhaseOptions,
  setSelectedIlmPhaseOptions,
  defaultStartTime,
  defaultEndTime,
}) => {
  const value = useMemo(
    () => ({
      httpFetch,
      toasts,
      isILMAvailable,
      telemetryEvents,
      addSuccessToast,
      canUserCreateAndReadCases,
      endDate,
      formatBytes,
      formatNumber,
      isAssistantEnabled,
      lastChecked,
      openCreateCaseFlyout,
      patterns,
      setLastChecked,
      startDate,
      theme,
      baseTheme,
      ilmPhases,
      selectedIlmPhaseOptions,
      setSelectedIlmPhaseOptions,
      defaultStartTime,
      defaultEndTime,
    }),
    [
      httpFetch,
      toasts,
      isILMAvailable,
      telemetryEvents,
      addSuccessToast,
      canUserCreateAndReadCases,
      endDate,
      formatBytes,
      formatNumber,
      isAssistantEnabled,
      lastChecked,
      openCreateCaseFlyout,
      patterns,
      setLastChecked,
      startDate,
      theme,
      baseTheme,
      ilmPhases,
      selectedIlmPhaseOptions,
      setSelectedIlmPhaseOptions,
      defaultStartTime,
      defaultEndTime,
    ]
  );

  return <DataQualityContext.Provider value={value}>{children}</DataQualityContext.Provider>;
};

export const useDataQualityContext = () => {
  const context = React.useContext(DataQualityContext);

  if (context == null) {
    throw new Error('useDataQualityContext must be used within a DataQualityProvider');
  }

  return context;
};
