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
import { remoteMonitorInfoSchema } from './remote';

/**
 * Read-only projection of a Synthetics monitor that has no local saved object.
 * Used for CCS remotes (`${remoteName}:synthetics-*`) and CPS linked-project
 * hits (same `_index` alias prefix, project alias instead of cluster name).
 *
 * This is intentionally a strict, narrow subset of
 * `EncryptedSyntheticsSavedMonitor`. Anything not listed here — enabled flag,
 * schedule, alert config, encrypted params, namespace, project script hash,
 * the SO's full configured locations array — is unavailable for remote
 * monitors and must not be inferred from this type.
 *
 * The `remote` field is REQUIRED (never undefined) and serves as the
 * discriminant for `useSelectedMonitor` consumers: a returned monitor with
 * `monitor.remote` populated is remote, anything else is the local SO. Use the
 * {@link isRemoteSyntheticsMonitor} type guard to narrow.
 *
 * @see useSelectedMonitor — the public consumer
 * @see useExternalMonitor — the hook that synthesizes values of this type from pings
 */
export const RemoteSyntheticsMonitorCodec = lazySchema(() =>
  z.looseObject({
    [ConfigKey.CONFIG_ID]: z.string(),
    [ConfigKey.MONITOR_QUERY_ID]: z.string(),
    [ConfigKey.NAME]: z.string(),
    [ConfigKey.MONITOR_TYPE]: MonitorTypeCodec,
    [ConfigKey.TAGS]: z.array(z.string()),
    [ConfigKey.LOCATIONS]: z.array(MonitorServiceLocationCodec),
    remote: remoteMonitorInfoSchema,
  })
);
