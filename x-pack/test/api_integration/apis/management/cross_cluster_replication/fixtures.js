/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REMOTE_CLUSTER_NAME } from './constants';
import { getRandomString } from './lib';

export const getFollowerIndexPayload = (
  leaderIndexName = getRandomString(),
  remoteCluster = REMOTE_CLUSTER_NAME,
  advancedSettings = {}
) => ({
  remoteCluster,
  leaderIndex: leaderIndexName,
  ...advancedSettings,
});
