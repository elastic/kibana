/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usePageReady } from '@kbn/ebt-tools';
import { useState } from 'react';

export const useSloPageReady = ({
  isReady,
  isLoading,
}: {
  isReady: boolean;
  isLoading: boolean;
}) => {
  const [isInitialLoadReported, setIsInitialLoadReported] = useState(false);

  usePageReady({
    isReady,
    isInitialLoadReported,
    isRefreshing: isInitialLoadReported && isLoading,
    onInitialLoadReported: () => {
      setIsInitialLoadReported(true);
    },
  });
};
