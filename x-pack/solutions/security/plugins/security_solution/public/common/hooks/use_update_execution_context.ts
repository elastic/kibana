/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useKibana } from '../lib/kibana';

export const useUpdateExecutionContext = () => {
  const { pathname } = useLocation();
  const { executionContext } = useKibana().services;

  useEffect(() => {
    // setImmediate is required to ensure that EBT telemetry for the previous page is shipped before the new page is updated
    setImmediate(() => {
      executionContext.set({ page: pathname });
    });
  }, [pathname, executionContext]);
};
