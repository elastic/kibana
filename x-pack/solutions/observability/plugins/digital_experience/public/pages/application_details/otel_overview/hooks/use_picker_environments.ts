/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { ApplicationOverviewResponse } from '../../../../../common/types/overview';

interface LoadedEnvironments {
  serviceName: string;
  environments: string[];
}

/**
 * The environments the picker offers for `serviceName`: those of its last loaded Overview, kept
 * while the next one loads or fails, and `undefined` until one has loaded.
 */
export const usePickerEnvironments = (
  serviceName: string,
  response: ApplicationOverviewResponse | undefined
): string[] | undefined => {
  const [lastLoaded, setLastLoaded] = useState<LoadedEnvironments>();

  useEffect(() => {
    if (response) {
      setLastLoaded({
        serviceName: response.overview.serviceName,
        environments: response.environments,
      });
    }
  }, [response]);

  if (response?.overview.serviceName === serviceName) {
    return response.environments;
  }
  return lastLoaded?.serviceName === serviceName ? lastLoaded.environments : undefined;
};
