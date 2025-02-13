/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllMissingPrivileges } from './privileges';
import type { EntityAnalyticsPrivileges } from '../api/entity_analytics';

describe('getAllMissingPrivileges', () => {
  it('should return all missing privileges for elasticsearch and kibana', () => {
    const privileges: EntityAnalyticsPrivileges = {
      privileges: {
        elasticsearch: {
          index: {
            'logs-*': { read: true, view_index_metadata: true },
            'auditbeat-*': { read: false, view_index_metadata: false },
          },
          cluster: {
            manage_enrich: false,
            manage_ingest_pipelines: true,
          },
        },
        kibana: {
          'saved_object:entity-engine-status/all': false,
          'saved_object:entity-definition/all': true,
        },
      },
      has_all_required: false,
      has_read_permissions: false,
      has_write_permissions: false,
    };

    const result = getAllMissingPrivileges(privileges);

    expect(result).toEqual({
      elasticsearch: {
        index: [{ indexName: 'auditbeat-*', privileges: ['read', 'view_index_metadata'] }],
        cluster: ['manage_enrich'],
      },
      kibana: ['saved_object:entity-engine-status/all'],
    });
  });

  it('should return empty lists if all privileges are true', () => {
    const privileges: EntityAnalyticsPrivileges = {
      privileges: {
        elasticsearch: {
          index: {
            'logs-*': { read: true, view_index_metadata: true },
          },
          cluster: {
            manage_enrich: true,
          },
        },
        kibana: {
          'saved_object:entity-engine-status/all': true,
        },
      },
      has_all_required: true,
      has_read_permissions: true,
      has_write_permissions: true,
    };

    const result = getAllMissingPrivileges(privileges);

    expect(result).toEqual({
      elasticsearch: {
        index: [],
        cluster: [],
      },
      kibana: [],
    });
  });

  it('should handle empty privileges object', () => {
    const privileges: EntityAnalyticsPrivileges = {
      privileges: {
        elasticsearch: {
          index: {},
          cluster: {},
        },
        kibana: {},
      },
      has_all_required: false,
      has_read_permissions: false,
      has_write_permissions: false,
    };

    const result = getAllMissingPrivileges(privileges);

    expect(result).toEqual({
      elasticsearch: {
        index: [],
        cluster: [],
      },
      kibana: [],
    });
  });
});
