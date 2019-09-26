/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { REMOTE_CLUSTER_NAME } from './constants';
import { getRandomString } from './lib';

export const getAutoFollowIndexPayload = (remoteCluster = REMOTE_CLUSTER_NAME) => ({
  remoteCluster,
  leaderIndexPatterns: [ 'leader-*'],
  followIndexPattern: '{{leader_index}}_follower'
});

export const getFollowerIndexPayload = (
  leaderIndexName = getRandomString(),
  remoteCluster = REMOTE_CLUSTER_NAME,
  advancedSettings = {}) => ({
  remoteCluster,
  leaderIndex: leaderIndexName,
  ...advancedSettings,
});
