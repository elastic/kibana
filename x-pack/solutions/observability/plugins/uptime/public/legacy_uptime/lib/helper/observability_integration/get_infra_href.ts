/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssetDetailsLocator } from '@kbn/observability-shared-plugin/common';
import { MonitorSummary, Ping } from '../../../../../common/runtime_types';
import { addBasePath } from './add_base_path';
import { buildHref } from './build_href';

export const getInfraContainerHref = (
  { state }: MonitorSummary,
  locator?: AssetDetailsLocator
): string | undefined => {
  if (!locator) {
    return undefined;
  }

  const pings = Array.isArray(state.summaryPings) ? state.summaryPings : [state.summaryPings];

  // Pick the first container id if one is available
  const containerId = pings[0]?.container?.id;

  return containerId
    ? locator.getRedirectUrl({
        assetType: 'container',
        assetId: containerId,
      })
    : undefined;
};

export const getInfraKubernetesHref = (
  { state }: MonitorSummary,
  locator?: AssetDetailsLocator
): string | undefined => {
  if (!locator) {
    return undefined;
  }

  const pings = Array.isArray(state.summaryPings) ? state.summaryPings : [state.summaryPings];

  // Pick the first pod id if one is available
  const podId = pings[0]?.kubernetes?.pod?.uid;

  return podId
    ? locator.getRedirectUrl({
        assetType: 'pod',
        assetId: podId,
      })
    : undefined;
};

export const getInfraIpHref = (summary: MonitorSummary, basePath: string) => {
  const getHref = (value: string | string[] | undefined) => {
    if (!value) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      const expression = encodeURIComponent(`host.ip : ${value}`);
      return addBasePath(
        basePath,
        `/app/metrics/inventory?waffleFilter=(expression:'${expression}',kind:kuery)`
      );
    }
    const ips = value.reduce(
      (str: string, cur: string) => (!str ? `host.ip : ${cur}` : str + ` or host.ip : ${cur}`),
      ''
    );
    return ips === ''
      ? undefined
      : addBasePath(
          basePath,
          `/app/metrics/inventory?waffleFilter=(expression:'${encodeURIComponent(ips)}',kind:kuery)`
        );
  };
  return buildHref(summary.state.summaryPings || [], (ping: Ping) => ping?.monitor?.ip, getHref);
};
