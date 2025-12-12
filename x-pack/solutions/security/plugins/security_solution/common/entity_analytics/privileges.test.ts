/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsPrivileges } from '../api/entity_analytics';
import { getMissingPrivilegesErrorMessage, getAllMissingPrivileges } from './privileges';
import type { MissingPrivileges } from './privileges';

describe('privileges', () => {
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

  describe('getMissingPrivilegesErrorMessage', () => {
    it('should return error messages for missing index, cluster, and kibana privileges', () => {
      const missingPrivileges: MissingPrivileges = {
        elasticsearch: {
          index: [
            { indexName: 'auditbeat-*', privileges: ['read', 'view_index_metadata'] },
            { indexName: 'logs-*', privileges: ['write'] },
          ],
          cluster: ['manage_enrich', 'monitor'],
        },
        kibana: ['saved_object:entity-engine-status/all', 'saved_object:entity-definition/all'],
      };

      const result = getMissingPrivilegesErrorMessage(missingPrivileges);

      expect(result).toBe(
        `Missing [read, view_index_metadata] privileges for index 'auditbeat-*'.\n` +
          `Missing [write] privileges for index 'logs-*'.\n` +
          `Missing [manage_enrich, monitor] cluster privileges.\n` +
          `Missing [saved_object:entity-engine-status/all, saved_object:entity-definition/all] Kibana privileges.`
      );
    });

    it('should return error messages for missing index and cluster privileges only', () => {
      const missingPrivileges: MissingPrivileges = {
        elasticsearch: {
          index: [{ indexName: 'auditbeat-*', privileges: ['read'] }],
          cluster: ['manage_enrich'],
        },
        kibana: [],
      };

      const result = getMissingPrivilegesErrorMessage(missingPrivileges);

      expect(result).toBe(
        `Missing [read] privileges for index 'auditbeat-*'.\n` +
          `Missing [manage_enrich] cluster privileges.`
      );
    });

    it('should return error messages for missing kibana privileges only', () => {
      const missingPrivileges: MissingPrivileges = {
        elasticsearch: {
          index: [],
          cluster: [],
        },
        kibana: ['saved_object:entity-engine-status/all'],
      };

      const result = getMissingPrivilegesErrorMessage(missingPrivileges);

      expect(result).toBe(`Missing [saved_object:entity-engine-status/all] Kibana privileges.`);
    });

    it('should return an empty string if there are no missing privileges', () => {
      const missingPrivileges: MissingPrivileges = {
        elasticsearch: {
          index: [],
          cluster: [],
        },
        kibana: [],
      };

      const result = getMissingPrivilegesErrorMessage(missingPrivileges);

      expect(result).toBe('');
    });
  });
});
