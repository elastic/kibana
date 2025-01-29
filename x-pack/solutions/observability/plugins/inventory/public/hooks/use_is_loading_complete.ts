/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

interface UseIsLoadingCompleteProps {
  loadingStates: boolean[];
}

export const useIsLoadingComplete = ({ loadingStates }: UseIsLoadingCompleteProps) => {
  const [isLoadingComplete, setIsLoadingComplete] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const someLoading = loadingStates.some((loading) => loading);
    const allLoaded = loadingStates.every((loading) => !loading);

    if (isLoadingComplete === undefined && someLoading) {
      setIsLoadingComplete(false);
    } else if (isLoadingComplete === false && allLoaded) {
      setIsLoadingComplete(true);
    }
  }, [isLoadingComplete, loadingStates]);

  return isLoadingComplete;
};
