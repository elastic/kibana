/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';

import { SECURITY_APP_PATH } from '../../../../schedules/constants';

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
