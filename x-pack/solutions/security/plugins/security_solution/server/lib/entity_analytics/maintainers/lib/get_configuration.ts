/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityMaintainerConfig } from '../maintainer';

export const getConfiguration = async (
  savedObjectId: string,
  spaceId: string
): Promise<EntityMaintainerConfig> => {
  // Placeholder configuration
  return {
    id: '.access_frequency',
    // can use data view ID...do we have it?
    input: `.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*/_search`,
    schedule: { interval: '1d' },
    enabled: true,
    pageSize: 3500,
    timeField: '@timestamp',
    lookbackWindow: '30d',
  };
};
