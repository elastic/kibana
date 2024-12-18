/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { useMemo } from 'react';
import { APP_UI_ID } from '../../../common';
import { useKibana } from '../lib/kibana';

export const isInSecurityApp = (currentAppId?: string): boolean => {
  return !!currentAppId && currentAppId === APP_UI_ID;
};

export const useIsInSecurityApp = () => {
  const {
    services: { application },
  } = useKibana();

  const currentAppId = useObservable(application.currentAppId$);

  return useMemo(() => isInSecurityApp(currentAppId), [currentAppId]);
};
