/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationResourceData } from '../../../../../../common/siem_migrations/model/common.gen';
import { SentinelProcessor } from './processor';
import type { VendorProcessorContext } from '../types';

const createProcessor = () =>
  new SentinelProcessor({
    migrationId: 'migration-1',
    dataClient: {} as VendorProcessorContext['dataClient'],
    logger: {} as VendorProcessorContext['logger'],
  });

const createWatchlistResource = (
  properties: Record<string, unknown> = {},
  asTemplate = false
): SiemMigrationResourceData => {
  const watchlistResource = {
    type: 'Microsoft.OperationalInsights/workspaces/providers/Watchlists',
    properties: {
      watchlistAlias: 'allowed_ports',
      rawContent: 'Ports,Description\r\n389,LDAP\r\n636,LDAPS\r\n"389,636",LDAP Both',
      itemsSearchKey: 'Ports',
      contentType: 'text/csv',
      ...properties,
    },
  };

  return {
    type: 'watchlist',
    name: 'uploaded-watchlist',
    content: JSON.stringify(
      asTemplate
        ? {
            $schema:
              'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
            contentVersion: '1.0.0.0',
            resources: [watchlistResource],
          }
        : watchlistResource
    ),
  };
};

describe('SentinelProcessor', () => {
  it('returns a resources processor that normalizes watchlists into lookup resources', () => {
    const resourcesProcessor = createProcessor().getProcessor('resources');

    const [lookup] = resourcesProcessor([createWatchlistResource()]);

    expect(lookup).toEqual({
      type: 'lookup',
      name: 'allowed_ports',
      content: expect.any(String),
      metadata: {
        itemsSearchKey: 'Ports',
      },
    });
    expect(JSON.parse(lookup.content)).toEqual([
      { Ports: '389', Description: 'LDAP' },
      { Ports: '636', Description: 'LDAPS' },
      { Ports: '389', Description: 'LDAP Both' },
      { Ports: '636', Description: 'LDAP Both' },
    ]);
  });

  it('rejects non-watchlist resources', () => {
    const resourcesProcessor = createProcessor().getProcessor('resources');
    const lookupResource: SiemMigrationResourceData = {
      type: 'lookup',
      name: 'existing_lookup',
      content: 'key,value\r\nfoo,bar',
    };

    expect(() => resourcesProcessor([lookupResource])).toThrow(
      'Unsupported Sentinel resource type: lookup'
    );
  });

  it('rejects watchlists with unsupported contentType', () => {
    const resourcesProcessor = createProcessor().getProcessor('resources');

    expect(() =>
      resourcesProcessor([createWatchlistResource({ contentType: 'application/json' })])
    ).toThrow('Unsupported Sentinel watchlist content type: application/json');
  });

  it('normalizes watchlist ARM templates', () => {
    const resourcesProcessor = createProcessor().getProcessor('resources');

    const [lookup] = resourcesProcessor([createWatchlistResource({}, true)]);

    expect(lookup.name).toBe('allowed_ports');
    expect(JSON.parse(lookup.content)).toEqual([
      { Ports: '389', Description: 'LDAP' },
      { Ports: '636', Description: 'LDAPS' },
      { Ports: '389', Description: 'LDAP Both' },
      { Ports: '636', Description: 'LDAP Both' },
    ]);
  });

  it('normalizes single-column watchlist CSV content', () => {
    const resourcesProcessor = createProcessor().getProcessor('resources');

    const [lookup] = resourcesProcessor([
      createWatchlistResource({
        watchlistAlias: 'LastPass',
        rawContent: 'name\r\nSamplevalue1\r\nsamplevalue4\r\n',
        itemsSearchKey: 'name',
      }),
    ]);

    expect(lookup.name).toBe('LastPass');
    expect(JSON.parse(lookup.content)).toEqual([
      { name: 'Samplevalue1' },
      { name: 'samplevalue4' },
    ]);
  });
});
