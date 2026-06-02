/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { paths } from '../../../../../common/constants/ui';
import type { OverviewStatusMetaData } from '../../../../../common/runtime_types';

// Subset of `OverviewStatusMetaData` actually required to build a deep link.
// Kept narrow so callers can pass minimal fixtures (and so tests don't need
// to construct a full meta object).
type RemoteMonitorLike = Pick<OverviewStatusMetaData, 'remote' | 'configId'>;

interface CreateBaseUrlArgs {
  monitor: RemoteMonitorLike;
  spaceId?: string;
  // Explicit remote Kibana URL that takes precedence over
  // `monitor.remote.kibanaUrl`. The overview-status metadata doesn't always
  // carry `kibanaUrl` (the `top_metrics` aggregation drops `text`-mapped
  // fields), so callers can supply the value read from a ping's `_source`.
  kibanaUrl?: string;
}

// We assume same-named spaces federate across clusters — i.e. the active
// local space is the right `/s/<spaceId>` to use on the remote cluster. The
// server-side `meta.space_id` filter makes this contract explicit
// (see #268720).
// Modeled on SLO's `createBaseRemoteSloDetailsUrl`
function createBaseRemoteMonitorDetailUrl({
  monitor,
  spaceId,
  kibanaUrl,
}: CreateBaseUrlArgs): URL | undefined {
  const resolvedKibanaUrl = kibanaUrl ?? monitor.remote?.kibanaUrl;
  if (!resolvedKibanaUrl) {
    return undefined;
  }

  const spacePath = spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '';
  return new URL(path.join(spacePath, paths.monitorDetail(monitor.configId)), resolvedKibanaUrl);
}

interface CreateRemoteMonitorDetailUrlArgs extends CreateBaseUrlArgs {
  locationId?: string;
}

export function createRemoteMonitorDetailUrl({
  monitor,
  locationId,
  spaceId,
  kibanaUrl,
}: CreateRemoteMonitorDetailUrlArgs): string | undefined {
  const url = createBaseRemoteMonitorDetailUrl({ monitor, spaceId, kibanaUrl });
  if (!url) {
    return undefined;
  }
  if (locationId) {
    url.searchParams.append('locationId', locationId);
  }
  return url.toString();
}
