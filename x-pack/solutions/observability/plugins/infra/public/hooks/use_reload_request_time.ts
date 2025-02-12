/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useCallback, useState } from 'react';

export const useReloadRequestTime = () => {
  const [reloadRequestTime, setReloadRequestTime] = useState(Date.now());

  const updateReloadRequestTime = useCallback(() => {
    setReloadRequestTime(Date.now());
  }, []);

  return {
    updateReloadRequestTime,
    reloadRequestTime,
  };
};

export const [ReloadRequestTimeProvider, useReloadRequestTimeContext] =
  createContainer(useReloadRequestTime);
