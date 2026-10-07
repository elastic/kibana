/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ErrorDetailsPathParams {
  stateId: string;
  configId: string;
  locationId?: string;
  spaceId?: string;
  remoteName?: string;
}

const errorDetailsSearch = ({
  locationId,
  spaceId,
  remoteName,
}: Pick<ErrorDetailsPathParams, 'locationId' | 'spaceId' | 'remoteName'>): string => {
  const params = new URLSearchParams();
  if (locationId) params.set('locationId', locationId);
  if (spaceId) params.set('spaceId', spaceId);
  if (remoteName) params.set('remoteName', remoteName);
  const search = params.toString();
  return search ? `?${search}` : '';
};

export const getErrorDetailsAppPath = ({
  configId,
  stateId,
  locationId,
  spaceId,
  remoteName,
}: ErrorDetailsPathParams): string => {
  return `/monitor/${configId}/errors/${stateId}${errorDetailsSearch({
    locationId,
    spaceId,
    remoteName,
  })}`;
};

export const getErrorDetailsUrl = ({
  basePath,
  ...pathParams
}: ErrorDetailsPathParams & { basePath: string }): string => {
  return `${basePath}/app/synthetics${getErrorDetailsAppPath(pathParams)}`;
};
