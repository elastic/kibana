/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_APP_PATH } from '../../../constants';

const DEFAULT_SPACE_ID = 'default';

const addSpaceIdToPath = (basePath: string, spaceId?: string, requestedPath?: string): string => {
  if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
    return `${basePath}/s/${spaceId}${requestedPath ?? ''}`;
  }
  return `${basePath}${requestedPath ?? ''}`;
};

export const getAlertUrl = ({
  alertDocId,
  basePath,
  spaceId,
}: {
  alertDocId: string;
  basePath?: string;
  spaceId?: string | null;
}) => {
  const alertDetailPath = `/attack_discovery?id=${alertDocId}`;
  const alertDetailPathWithAppPath = `${SECURITY_APP_PATH}${alertDetailPath}`;
  return basePath
    ? addSpaceIdToPath(basePath, spaceId ?? undefined, alertDetailPathWithAppPath)
    : undefined;
};
