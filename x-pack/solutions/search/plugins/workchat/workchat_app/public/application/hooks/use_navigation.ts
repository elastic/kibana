/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useKibana } from './use_kibana';
import { workchatAppId } from '../constants';

export const useNavigation = () => {
  const {
    services: { application },
  } = useKibana();

  const navigateToWorkchatUrl = useCallback(
    (path: string) => {
      application.navigateToApp(workchatAppId, { path });
    },
    [application]
  );

  const createWorkchatUrl = useCallback(
    (path: string) => {
      return application.getUrlForApp(workchatAppId, { path });
    },
    [application]
  );

  return {
    createWorkchatUrl,
    navigateToWorkchatUrl,
  };
};
