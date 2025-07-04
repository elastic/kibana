/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { GetAppUrl } from '@kbn/security-solution-navigation/src/navigation';
import { useNavigation } from '@kbn/security-solution-navigation/src/navigation';
import { APP_UI_ID } from '../../../../common';

export const useIntegrationLinkState = (path: string) => {
  const { getAppUrl } = useNavigation();

  return useMemo(() => getIntegrationLinkState(path, getAppUrl), [getAppUrl, path]);
};

export const getIntegrationLinkState = (path: string, getAppUrl: GetAppUrl) => {
  const url = getAppUrl({
    appId: APP_UI_ID,
    path,
  });

  return {
    onCancelNavigateTo: [APP_UI_ID, { path }],
    onCancelUrl: url,
    onSaveNavigateTo: [APP_UI_ID, { path }],
  };
};
