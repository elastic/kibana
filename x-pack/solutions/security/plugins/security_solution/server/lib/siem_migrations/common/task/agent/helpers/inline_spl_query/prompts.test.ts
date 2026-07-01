/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnrichedMigrationResources } from '../../../util/enrich_lookup_resources';
import { getResourcesContext } from './prompts';

describe('getResourcesContext', () => {
  it('serializes enriched lookup resources as source name to lookup index name only', () => {
    const resources: EnrichedMigrationResources = {
      lookup: [
        {
          type: 'lookup',
          name: 'threat_intel_ip',
          content: 'lookup_default_threat_intel_ip',
          fields: [
            { path: 'ip', type: 'ip' },
            { path: 'threat_category', type: 'keyword' },
          ],
        },
      ],
    };

    expect(JSON.parse(getResourcesContext(resources).lookups)).toEqual({
      threat_intel_ip: 'lookup_default_threat_intel_ip',
    });
    expect(getResourcesContext(resources).lookups).not.toContain('fields');
  });
});
