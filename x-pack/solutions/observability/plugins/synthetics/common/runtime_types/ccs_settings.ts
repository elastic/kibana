/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const remoteSyntheticsClusterSchema = t.type({
  name: t.string,
  isConnected: t.boolean,
});

export const syntheticsCCSSettingsSchema = t.type({
  useAllRemoteClusters: t.boolean,
  selectedRemoteClusters: t.array(t.string),
  remoteKibanaUrls: t.record(t.string, t.string),
});

export type RemoteSyntheticsCluster = t.TypeOf<typeof remoteSyntheticsClusterSchema>;
export type SyntheticsCCSSettings = t.TypeOf<typeof syntheticsCCSSettingsSchema>;
