/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertSentinelWatchlistToResource } from './sentinel_watchlist';

describe('convertSentinelWatchlistToResource', () => {
  it('uses the watchlist alias as the resource name for ARM template uploads', () => {
    const fileContent = JSON.stringify({
      $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
      contentVersion: '1.0.0.0',
      resources: [
        {
          type: 'Microsoft.OperationalInsights/workspaces/providers/Watchlists',
          properties: {
            watchlistAlias: 'NetworkSession_Monitor_Configuration',
            rawContent: 'Ports,Name\r\n389,LDAP',
            itemsSearchKey: 'Ports',
            contentType: 'text/csv',
          },
        },
      ],
    });

    expect(
      convertSentinelWatchlistToResource({
        fileContent,
        fallbackName: 'watchlist_network_session_monitor_configuration.arm',
      })
    ).toEqual({
      type: 'watchlist',
      name: 'NetworkSession_Monitor_Configuration',
      content: fileContent,
    });
  });
});
