/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

const GENERATIONS_POLL_INTERVAL_MS = 10_000; // 10 seconds

/**
 * Polls the attack discovery generations endpoint on a fixed interval, cancelling
 * any in-flight request on unmount. Mirrors the polling behavior of the Attack
 * Discovery history view.
 */
export const usePollGenerations = ({
  cancelRequest,
  refetch,
}: {
  cancelRequest: () => void;
  refetch: () => void;
}): void => {
  useEffect(() => {
    const intervalId = setInterval(() => {
      refetch();
    }, GENERATIONS_POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      cancelRequest();
    };
  }, [cancelRequest, refetch]);
};
