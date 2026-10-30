/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';

/**
 * Follows a boolean feature flag, so a change applies to the next read without a redeploy.
 * Returns `untilRead` until start services resolve and the flag has been read, so a caller can
 * pick the safe value for that window.
 */
export const followBooleanFlag = (
  getStartServices: CoreSetup['getStartServices'],
  flag: string,
  { fallback, untilRead }: { fallback: boolean; untilRead: boolean }
): (() => boolean) => {
  let value = untilRead;
  void getStartServices().then(([{ featureFlags }]) => {
    featureFlags.getBooleanValue$(flag, fallback).subscribe((next) => {
      value = next;
    });
  });
  return () => value;
};
