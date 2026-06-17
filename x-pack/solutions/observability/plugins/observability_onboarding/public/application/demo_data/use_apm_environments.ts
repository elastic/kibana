/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { HttpStart } from '@kbn/core/public';
import { getApmEnvironments } from './api';

interface ApmEnvironmentsState {
  environments: string[];
  isLoading: boolean;
  error?: Error;
}

export const useApmEnvironments = (http: HttpStart): ApmEnvironmentsState => {
  const [state, setState] = useState<ApmEnvironmentsState>({
    environments: [],
    isLoading: true,
  });

  useEffect(() => {
    let ignore = false;

    setState({ environments: [], isLoading: true });

    getApmEnvironments(http)
      .then(({ environments }) => {
        if (!ignore) {
          setState({ environments, isLoading: false });
        }
      })
      .catch((error: Error) => {
        if (!ignore) {
          setState({ environments: [], isLoading: false, error });
        }
      });

    return () => {
      ignore = true;
    };
  }, [http]);

  return state;
};
