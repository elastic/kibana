/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getTestRunDetailRelativeLink = ({
  monitorId,
  checkGroup,
  locationId,
  spaceId,
  remoteName,
}: {
  monitorId: string;
  checkGroup: string;
  locationId?: string;
  spaceId?: string;
  remoteName?: string;
}) => {
  const params = new URLSearchParams();
  if (locationId) params.set('locationId', locationId);
  if (spaceId) params.set('spaceId', spaceId);
  if (remoteName) params.set('remoteName', remoteName);
  const search = params.toString();
  return `/monitor/${monitorId}/test-run/${checkGroup}${search ? `?${search}` : ''}`;
};

export const getTestRunDetailLink = ({
  monitorId,
  basePath,
  checkGroup,
  locationId,
  spaceId,
  remoteName,
}: {
  monitorId: string;
  checkGroup: string;
  basePath: string;
  locationId?: string;
  spaceId?: string;
  remoteName?: string;
}) => {
  return `${basePath}/app/synthetics${getTestRunDetailRelativeLink({
    monitorId,
    checkGroup,
    locationId,
    spaceId,
    remoteName,
  })}`;
};
