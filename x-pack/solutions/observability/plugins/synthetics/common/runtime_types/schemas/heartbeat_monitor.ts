/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';
import { ConfigKey } from '../monitor_management/config_key';
import { MonitorTypeCodec } from './monitor_configs';
import { MonitorServiceLocationCodec } from './locations';

/**
 * Discriminates monitors that have no Synthetics saved object and are surfaced
 * read-only in the app. Today the only such local provenance is `heartbeat`:
 * monitors run by Heartbeat / Elastic Agent (most notably Kubernetes/Docker
 * autodiscovery) that ship pings into local `synthetics-*` without ever
 * creating a saved object.
 *
 * This is the local counterpart to the `remote` discriminator used for CCS
 * monitors — same shape of problem (pings exist, no saved object), different
 * source (local index instead of a remote cluster).
 */
export const MonitorOriginCodec = lazySchema(() => z.literal('heartbeat'));

/**
 * Read-only projection of a monitor that is run by Heartbeat / Elastic Agent
 * and has NO Synthetics saved object. Derived purely from local ping data in
 * `synthetics-*`.
 *
 * Intentionally a strict, narrow subset of `EncryptedSyntheticsSavedMonitor`,
 * mirroring {@link RemoteSyntheticsMonitor}. Anything not listed here — enabled
 * flag, alert config, encrypted params, project script hash, the SO's full
 * configured locations array — does not exist for these monitors and must not
 * be inferred from this type.
 *
 * The `origin` field is REQUIRED and serves as the discriminant: a returned
 * monitor with `origin: 'heartbeat'` is Heartbeat-managed. Use the
 * {@link isHeartbeatSyntheticsMonitor} type guard to narrow.
 */
export const HeartbeatSyntheticsMonitorCodec = lazySchema(() =>
  z.looseObject({
    [ConfigKey.CONFIG_ID]: z.string(),
    [ConfigKey.MONITOR_QUERY_ID]: z.string(),
    [ConfigKey.NAME]: z.string(),
    [ConfigKey.MONITOR_TYPE]: MonitorTypeCodec,
    [ConfigKey.TAGS]: z.array(z.string()),
    [ConfigKey.LOCATIONS]: z.array(MonitorServiceLocationCodec),
    origin: MonitorOriginCodec,
  })
);
