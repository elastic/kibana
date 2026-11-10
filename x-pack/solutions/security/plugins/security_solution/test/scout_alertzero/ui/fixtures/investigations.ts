/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import type { ApiServicesFixture, KbnClient } from '@kbn/scout-security';

const AGENT_BUILDER_HEADERS = { 'elastic-api-version': '2023-10-31' };

/**
 * AlertZero works only in a Security space, but the default space can use the Classic view.
 * Set the Security view, turn on the AlertZero setting, and return a function that restores both.
 */
export const enableAlertZero = async ({
  apiServices,
  kbnClient,
}: {
  apiServices: ApiServicesFixture;
  kbnClient: KbnClient;
}): Promise<() => Promise<void>> => {
  const {
    data: { solution = 'classic' },
  } = await kbnClient.request<{ solution?: string }>({
    method: 'GET',
    path: '/api/spaces/space/default',
  });
  const restoreSolutionView =
    solution === 'security'
      ? undefined
      : async () =>
          apiServices.spaces.setSolutionView({
            id: 'default',
            solution: solution as 'classic' | 'oblt' | 'es',
          });
  if (restoreSolutionView) {
    await apiServices.spaces.setSolutionView({ id: 'default', solution: 'security' });
  }
  await kbnClient.uiSettings.update({ [ALERTZERO_ENABLED_SETTING_ID]: true });

  return async () => {
    await kbnClient.uiSettings.unset(ALERTZERO_ENABLED_SETTING_ID);
    await restoreSolutionView?.();
  };
};

/** AlertZero shows the onboarding page, not the queue, when no investigation exists. */
export const createInvestigation = async (kbnClient: KbnClient, title: string): Promise<string> => {
  const created = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/agent_builder/conversations',
    headers: AGENT_BUILDER_HEADERS,
    body: {
      title,
      template_id: 'investigation',
      access_control: { access_mode: 'public' },
      metadata: { status: 'open' },
    },
  });
  return created.data.id;
};

export const deleteInvestigation = async (kbnClient: KbnClient, id: string): Promise<void> => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/agent_builder/conversations/${id}`,
    headers: AGENT_BUILDER_HEADERS,
  });
};
