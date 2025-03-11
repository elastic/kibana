/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataQualityProviderProps } from '../../../data_quality_context';

import { formatBytes as formatBytesMock, formatNumber as formatNumberMock } from './format';

export const getMergedDataQualityContextProps = (
  dataQualityContextProps?: Partial<DataQualityProviderProps>
) => {
  const {
    isILMAvailable,
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
  } = {
    isILMAvailable: true,
    addSuccessToast: jest.fn(),
    canUserCreateAndReadCases: jest.fn(() => true),
    endDate: null,
    formatBytes: formatBytesMock,
    formatNumber: formatNumberMock,
    isAssistantEnabled: true,
    lastChecked: '2023-03-28T22:27:28.159Z',
    openCreateCaseFlyout: jest.fn(),
    patterns: ['auditbeat-*'],
    setLastChecked: jest.fn(),
    startDate: null,
    theme: {
      background: {
        color: '#000',
      },
    },
    baseTheme: {
      background: {
        color: '#000',
      },
    },
    ilmPhases: ['hot', 'warm', 'unmanaged'],
    selectedIlmPhaseOptions: [
      {
        label: 'hot',
        value: 'hot',
      },
      {
        label: 'warm',
        value: 'warm',
      },
      {
        label: 'unmanaged',
        value: 'unmanaged',
      },
    ],
    setSelectedIlmPhaseOptions: jest.fn(),
    defaultStartTime: 'now-7d/d',
    defaultEndTime: 'now/d',
    ...dataQualityContextProps,
  };

  return {
    isILMAvailable,
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
  };
};
