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
  spaceId,
}: {
  stateId: string;
  basePath: string;
  configId: string;
  locationId?: string;
  spaceId?: string;
}) => {
  const params = new URLSearchParams();
  if (locationId) params.set('locationId', locationId);
  if (spaceId) params.set('spaceId', spaceId);
  const search = params.toString();
  return `${basePath}/app/synthetics/monitor/${configId}/errors/${stateId}${
    search ? `?${search}` : ''
  }`;
};
