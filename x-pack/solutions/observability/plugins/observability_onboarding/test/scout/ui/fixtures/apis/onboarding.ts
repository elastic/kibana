/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-oblt';

export interface WiredStreamsStatus {
  enabled: boolean | 'conflict';
  can_manage: boolean;
}

export interface OnboardingApiService {
  updateInstallationStepStatus: (
    onboardingId: string,
    step: string,
    status: string,
    payload?: object
  ) => Promise<void>;
  enableWiredStreams: () => Promise<void>;
  disableWiredStreams: () => Promise<void>;
  getWiredStreamsStatus: () => Promise<WiredStreamsStatus>;
}

export const getOnboardingApiHelper = (kbnClient: KbnClient): OnboardingApiService => {
  return {
    updateInstallationStepStatus: async (
      onboardingId: string,
      step: string,
      status: string,
      payload?: object
    ) => {
      await kbnClient.request({
        method: 'POST',
        path: `/internal/observability_onboarding/flow/${onboardingId}/step/${step}`,
        body: {
          status,
          payload,
        },
      });
    },

    enableWiredStreams: async () => {
      await kbnClient.request({
        method: 'POST',
        path: '/api/streams/_enable',
      });
    },

    disableWiredStreams: async () => {
      await kbnClient.request({
        method: 'POST',
        path: '/api/streams/_disable',
      });
    },

    getWiredStreamsStatus: async (): Promise<WiredStreamsStatus> => {
      const response = await kbnClient.request<WiredStreamsStatus>({
        method: 'GET',
        path: '/api/streams/_status',
      });
      return response.data;
    },
  };
};
