/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { TransactionOptions } from '@elastic/apm-rum';
import { useKibana } from '../kibana';
import type { ApmSearchRequestName } from './types';

const DEFAULT_TRANSACTION_OPTIONS: TransactionOptions = { managed: true };

interface StartTransactionOptions {
  name: string;
  type?: string;
  options?: TransactionOptions;
}

export const useStartTransaction = () => {
  const {
    services: { apm },
  } = useKibana();

  const startTransaction = useCallback(
    ({ name, type = 'user-interaction', options }: StartTransactionOptions) => {
      return apm.startTransaction(name, type, options ?? DEFAULT_TRANSACTION_OPTIONS);
    },
    [apm]
  );

  return { startTransaction };
};

export const getSearchTransactionName = (timelineId: string): ApmSearchRequestName =>
  `Timeline search ${timelineId}`;
