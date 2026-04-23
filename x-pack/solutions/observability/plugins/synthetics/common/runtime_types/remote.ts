/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const remoteMonitorInfoSchema = t.intersection([
  t.type({
    remoteName: t.string,
  }),
  t.partial({
    kibanaUrl: t.string,
  }),
]);

export type RemoteMonitorInfo = t.TypeOf<typeof remoteMonitorInfoSchema>;

/**
 * Represents a monitor discovered from a remote cluster via CCS.
 * These monitors have no local saved object — their metadata is
 * extracted from the latest ping documents in remote synthetics indices.
 */
export const RemoteMonitorListItemCodec = t.intersection([
  t.type({
    configId: t.string,
    name: t.string,
    type: t.string,
    remote: remoteMonitorInfoSchema,
  }),
  t.partial({
    tags: t.array(t.string),
    schedule: t.string,
    locations: t.array(t.string),
    enabled: t.boolean,
    urls: t.string,
  }),
]);

export type RemoteMonitorListItem = t.TypeOf<typeof RemoteMonitorListItemCodec>;
