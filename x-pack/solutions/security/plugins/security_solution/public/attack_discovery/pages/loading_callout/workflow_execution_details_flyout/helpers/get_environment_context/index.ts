/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EnvironmentContext {
  kibanaVersion?: string;
  spaceId?: string;
}

interface EnvironmentContextServices {
  kibanaVersion?: string;
  spaces?: {
    getActiveSpace: () => Promise<{ id: string }>;
  };
}

/** Extracts privacy-safe environment context (Kibana version, space ID) from Kibana services */
export const getEnvironmentContext = async ({
  kibanaVersion,
  spaces,
}: EnvironmentContextServices): Promise<EnvironmentContext> => {
  const spaceId = (await spaces?.getActiveSpace())?.id;

  return {
    kibanaVersion,
    spaceId,
  };
};
