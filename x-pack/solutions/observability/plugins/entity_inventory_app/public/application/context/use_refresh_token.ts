/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

export const useRefreshToken = (
  trigger: string
): { refreshToken: number; bumpRefreshToken: () => void } => {
  const [refreshToken, setRefreshToken] = useState(0);
  const [currentTrigger, setCurrentTrigger] = useState(trigger);
  // Compared while rendering, so components that mount in the same pass already see the new value.
  if (currentTrigger !== trigger) {
    setCurrentTrigger(trigger);
    setRefreshToken((token) => token + 1);
  }
  const bumpRefreshToken = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { refreshToken, bumpRefreshToken };
};
