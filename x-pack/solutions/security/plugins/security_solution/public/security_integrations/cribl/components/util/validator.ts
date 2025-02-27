/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RouteEntry } from '../../../../../common/security_integrations/cribl/types';

export const hasAtLeastOneValidRouteEntry = (routeEntries: RouteEntry[]) => {
  return routeEntries.some((re) => {
    const hasCriblDataId = re.dataId && re.dataId.length > 0;
    const hasDatastreamTarget = re.datastream && re.datastream.length > 0;
    return hasCriblDataId && hasDatastreamTarget;
  });
};

export const allRouteEntriesArePaired = (routeEntries: RouteEntry[]) => {
  return routeEntries.every((re) => {
    const hasCriblDataId = re.dataId && re.dataId.length > 0;
    const hasDatastreamTarget = re.datastream && re.datastream.length > 0;
    return (hasCriblDataId && hasDatastreamTarget) || (!hasCriblDataId && !hasDatastreamTarget);
  });
};
