/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

/** A loaded tab's application and the environments it reported. */
interface WithEnvironments {
  serviceName: string;
  environments: string[];
}

/**
 * The environments the picker of a tab offers for `serviceName`: those of its last loaded response,
 * kept while the next one loads or fails, and `undefined` until one has loaded.
 */
export const useLastEnvironments = (
  serviceName: string,
  response: WithEnvironments | undefined
): string[] | undefined => {
  const [lastLoaded, setLastLoaded] = useState<WithEnvironments>();

  useEffect(() => {
    if (response) {
      setLastLoaded({ serviceName: response.serviceName, environments: response.environments });
    }
  }, [response]);

  if (response?.serviceName === serviceName) {
    return response.environments;
  }
  return lastLoaded?.serviceName === serviceName ? lastLoaded.environments : undefined;
};
