/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getErrorDetailsUrl = ({
  basePath,
  configId,
  stateId,
  locationId,
}: {
  stateId: string;
  basePath: string;
  configId: string;
  locationId?: string;
}) => {
  const path = `${basePath}/app/synthetics/monitor/${configId}/errors/${stateId}`;
  if (!locationId) {
    return path;
  }
  return `${path}?locationId=${encodeURIComponent(locationId)}`;
};
