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
// Modeled on SLO's `createBaseRemoteSloDetailsUrl`.
function createBaseRemoteMonitorUrl(
  { monitor, spaceId, kibanaUrl }: CreateBaseUrlArgs,
  appPath: string
): URL | undefined {
  const resolvedKibanaUrl = kibanaUrl ?? monitor.remote?.kibanaUrl;
  if (!resolvedKibanaUrl) {
    return undefined;
  }

  const spacePath = spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '';
  return new URL(path.join(spacePath, appPath), resolvedKibanaUrl);
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
  const url = createBaseRemoteMonitorUrl(
    { monitor, spaceId, kibanaUrl },
    paths.monitorDetail(monitor.configId)
  );
  if (!url) {
    return undefined;
  }
  if (locationId) {
    url.searchParams.append('locationId', locationId);
  }
  return url.toString();
}

// All mutating-action helpers below mirror SLO's `remote_slo_urls.ts` shape:
// they return `undefined` when the monitor isn't remote or `kibanaUrl` is
// missing, otherwise they produce a deep link to the same action on the
// origin cluster. Callers open the result in a new tab.
//
// Enable / Disable / Delete piggy-back on the monitor-detail URL using
// query-param flags (`?enable=true`, `?disable=true`, `?delete=true`) — the
// same pattern SLO uses to trigger the action modal once the user lands on
// the remote cluster. The remote synthetics details page is expected to
// surface those actions in a follow-up; the helpers themselves are pure URL
// builders and do not depend on the remote handler.
export function createRemoteMonitorEditUrl({
  monitor,
  spaceId,
  kibanaUrl,
}: CreateBaseUrlArgs): string | undefined {
  return createBaseRemoteMonitorUrl(
    { monitor, spaceId, kibanaUrl },
    paths.monitorEdit(monitor.configId)
  )?.toString();
}

export function createRemoteMonitorEnableUrl({
  monitor,
  spaceId,
  kibanaUrl,
}: CreateBaseUrlArgs): string | undefined {
  const url = createBaseRemoteMonitorUrl(
    { monitor, spaceId, kibanaUrl },
    paths.monitorDetail(monitor.configId)
  );
  if (!url) {
    return undefined;
  }
  url.searchParams.append('enable', 'true');
  return url.toString();
}

export function createRemoteMonitorDisableUrl({
  monitor,
  spaceId,
  kibanaUrl,
}: CreateBaseUrlArgs): string | undefined {
  const url = createBaseRemoteMonitorUrl(
    { monitor, spaceId, kibanaUrl },
    paths.monitorDetail(monitor.configId)
  );
  if (!url) {
    return undefined;
  }
  url.searchParams.append('disable', 'true');
  return url.toString();
}

export function createRemoteMonitorDeleteUrl({
  monitor,
  spaceId,
  kibanaUrl,
}: CreateBaseUrlArgs): string | undefined {
  const url = createBaseRemoteMonitorUrl(
    { monitor, spaceId, kibanaUrl },
    paths.monitorDetail(monitor.configId)
  );
  if (!url) {
    return undefined;
  }
  url.searchParams.append('delete', 'true');
  return url.toString();
}

export function createRemoteMonitorCloneUrl({
  monitor,
  spaceId,
  kibanaUrl,
}: CreateBaseUrlArgs): string | undefined {
  const url = createBaseRemoteMonitorUrl({ monitor, spaceId, kibanaUrl }, paths.monitorAdd);
  if (!url) {
    return undefined;
  }
  url.searchParams.append('cloneId', monitor.configId);
  return url.toString();
}
