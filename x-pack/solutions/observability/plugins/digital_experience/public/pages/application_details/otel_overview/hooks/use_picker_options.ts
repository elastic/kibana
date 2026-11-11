/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { OverviewFilterOptions } from '../../../../../common/overview_filters';
import type { ApplicationOverviewResponse } from '../../../../../common/types/overview';

export interface PickerOptions {
  environments: string[];
  filters: OverviewFilterOptions;
}

interface LoadedOptions extends PickerOptions {
  serviceName: string;
}

/**
 * The environments and filter values the pickers offer for `serviceName`: those of its last loaded
 * Overview, kept while the next one loads or fails, and `undefined` until one has loaded.
 */
export const usePickerOptions = (
  serviceName: string,
  response: ApplicationOverviewResponse | undefined
): PickerOptions | undefined => {
  const [lastLoaded, setLastLoaded] = useState<LoadedOptions>();

  useEffect(() => {
    if (response) {
      setLastLoaded({
        serviceName: response.overview.serviceName,
        environments: response.environments,
        filters: response.filters,
      });
    }
  }, [response]);

  if (response?.overview.serviceName === serviceName) {
    return { environments: response.environments, filters: response.filters };
  }
  return lastLoaded?.serviceName === serviceName ? lastLoaded : undefined;
};
