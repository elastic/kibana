/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_NAME,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS,
} from '../../schedules/fields';
import { combineFindAttackDiscoveryFilters } from '.';

describe('combineFindAttackDiscoveryFilters', () => {
  describe('when no filters are provided', () => {
    it('returns an empty string when all parameters are undefined', () => {
      const result = combineFindAttackDiscoveryFilters({});

      expect(result).toBe('');
    });

    it('returns an empty string when all arrays are empty', () => {
      const result = combineFindAttackDiscoveryFilters({
        alertIds: [],
        connectorNames: [],
        ids: [],
        status: [],
      });

      expect(result).toBe('');
    });
  });

  describe('when a search filter is provided', () => {
    it('returns the expected search filter for single search term', () => {
      const result = combineFindAttackDiscoveryFilters({
        search: 'malware',
      });

      const expectedSearchFilter = `(${ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS}: "*malware*" OR ${ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS}: "*malware*" OR ${ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS}: "*malware*" OR ${ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS}: "*malware*")`;

      expect(result).toBe(expectedSearchFilter);
    });

    it('returns a search filter with a trimmed search term', () => {
      const result = combineFindAttackDiscoveryFilters({
        search: '  suspicious activity  ',
      });

      const expectedSearchFilter = `(${ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS}: "*suspicious activity*" OR ${ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS}: "*suspicious activity*" OR ${ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS}: "*suspicious activity*" OR ${ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS}: "*suspicious activity*")`;

      expect(result).toBe(expectedSearchFilter);
    });

    it('returns an empty string when search is empty string', () => {
      const result = combineFindAttackDiscoveryFilters({
        search: '',
      });

      expect(result).toBe('');
    });

    it('returns an empty string when search is only whitespace', () => {
      const result = combineFindAttackDiscoveryFilters({
        search: '   ',
      });

      expect(result).toBe('');
    });

    it('returns a search filter with escaped special characters', () => {
      const result = combineFindAttackDiscoveryFilters({
        search: 'test+search-term=value&other|more>less<!(){}[]^"~*?:\\/',
      });

      const expectedSearchFilter = `(${ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS}: "*test\\+search\\-term\\=value\\&other\\|more\\>less\\<\\!\\(\\)\\{\\}\\[\\]\\^\\"\\~\\*\\?\\:\\\\\\/*" OR ${ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS}: "*test\\+search\\-term\\=value\\&other\\|more\\>less\\<\\!\\(\\)\\{\\}\\[\\]\\^\\"\\~\\*\\?\\:\\\\\\/*" OR ${ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS}: "*test\\+search\\-term\\=value\\&other\\|more\\>less\\<\\!\\(\\)\\{\\}\\[\\]\\^\\"\\~\\*\\?\\:\\\\\\/*" OR ${ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS}: "*test\\+search\\-term\\=value\\&other\\|more\\>less\\<\\!\\(\\)\\{\\}\\[\\]\\^\\"\\~\\*\\?\\:\\\\\\/*")`;

      expect(result).toBe(expectedSearchFilter);
    });
  });

  describe('when an ids filter is provided', () => {
    it('returns ids filter for single id', () => {
      const result = combineFindAttackDiscoveryFilters({
        ids: ['id1'],
      });

      expect(result).toBe('(_id: "id1")');
    });

    it('returns ids filter for multiple ids', () => {
      const result = combineFindAttackDiscoveryFilters({
        ids: ['id1', 'id2', 'id3'],
      });

      expect(result).toBe('(_id: "id1" OR _id: "id2" OR _id: "id3")');
    });

    it('returns an empty string when ids is empty array', () => {
      const result = combineFindAttackDiscoveryFilters({
        ids: [],
      });

      expect(result).toBe('');
    });
  });

  describe('when status filter is provided', () => {
    it('returns a status filter for single status', () => {
      const result = combineFindAttackDiscoveryFilters({
        status: ['open'],
      });

      expect(result).toBe(`(${ALERT_WORKFLOW_STATUS}: "open")`);
    });

    it('returns a status filter for multiple statuses', () => {
      const result = combineFindAttackDiscoveryFilters({
        status: ['open', 'closed', 'acknowledged'],
      });

      expect(result).toBe(
        `(${ALERT_WORKFLOW_STATUS}: "open" OR ${ALERT_WORKFLOW_STATUS}: "closed" OR ${ALERT_WORKFLOW_STATUS}: "acknowledged")`
      );
    });

    it('returns an empty string when status is empty array', () => {
      const result = combineFindAttackDiscoveryFilters({
        status: [],
      });

      expect(result).toBe('');
    });
  });

  describe('when a connectorNames filter is provided', () => {
    it('returns a connectorNames filter for single connector', () => {
      const result = combineFindAttackDiscoveryFilters({
        connectorNames: ['GPT-4'],
      });

      expect(result).toBe(`(${ALERT_ATTACK_DISCOVERY_API_CONFIG_NAME}: "GPT-4")`);
    });

    it('returns a connectorNames filter for multiple connectors', () => {
      const result = combineFindAttackDiscoveryFilters({
        connectorNames: ['GPT-4', 'Claude', 'Bedrock'],
      });

      expect(result).toBe(
        `(${ALERT_ATTACK_DISCOVERY_API_CONFIG_NAME}: "GPT-4" OR ${ALERT_ATTACK_DISCOVERY_API_CONFIG_NAME}: "Claude" OR ${ALERT_ATTACK_DISCOVERY_API_CONFIG_NAME}: "Bedrock")`
      );
    });

    it('returns an empty string when connectorNames is empty array', () => {
      const result = combineFindAttackDiscoveryFilters({
        connectorNames: [],
      });

      expect(result).toBe('');
    });
  });

  describe('when an alertIds filter is provided', () => {
    it('returns an alertIds filter for single alert ID', () => {
      const result = combineFindAttackDiscoveryFilters({
        alertIds: ['alert123'],
      });

      expect(result).toBe(`(${ALERT_ATTACK_DISCOVERY_ALERT_IDS}: "alert123")`);
    });

    it('returns an alertIds filter for multiple alert IDs', () => {
      const result = combineFindAttackDiscoveryFilters({
        alertIds: ['alert123', 'alert456', 'alert789'],
      });

      expect(result).toBe(
        `(${ALERT_ATTACK_DISCOVERY_ALERT_IDS}: "alert123" OR ${ALERT_ATTACK_DISCOVERY_ALERT_IDS}: "alert456" OR ${ALERT_ATTACK_DISCOVERY_ALERT_IDS}: "alert789")`
      );
    });

    it('returns an empty string when alertIds is empty array', () => {
      const result = combineFindAttackDiscoveryFilters({
        alertIds: [],
      });

      expect(result).toBe('');
    });
  });

  describe('when an executionUuid filter is provided', () => {
    it('returns an executionUuid filter when provided', () => {
      const result = combineFindAttackDiscoveryFilters({
        executionUuid: 'execution-123-uuid',
      });

      expect(result).toBe('kibana.alert.rule.execution.uuid: "execution-123-uuid"');
    });

    it('returns an empty string when executionUuid is undefined', () => {
      const result = combineFindAttackDiscoveryFilters({
        executionUuid: undefined,
      });

      expect(result).toBe('');
    });

    it('returns an empty string when executionUuid is an empty string', () => {
      const result = combineFindAttackDiscoveryFilters({
        executionUuid: '',
      });

      expect(result).toBe('');
    });
  });

  describe('when a date range filters are provided', () => {
    it('returns a start date filter when start is provided', () => {
      const result = combineFindAttackDiscoveryFilters({
        start: '2024-01-01T00:00:00.000Z',
      });

      expect(result).toBe('@timestamp >= "2024-01-01T00:00:00.000Z"');
    });

    it('returns an end date filter when end is provided', () => {
      const result = combineFindAttackDiscoveryFilters({
        end: '2024-12-31T23:59:59.999Z',
      });

      expect(result).toBe('@timestamp <= "2024-12-31T23:59:59.999Z"');
    });

    it('returns both date filters when start and end are provided', () => {
      const result = combineFindAttackDiscoveryFilters({
        start: '2024-01-01T00:00:00.000Z',
        end: '2024-12-31T23:59:59.999Z',
      });

      expect(result).toBe(
        '@timestamp >= "2024-01-01T00:00:00.000Z" AND @timestamp <= "2024-12-31T23:59:59.999Z"'
      );
    });
  });

  describe('when multiple filters are provided', () => {
    it('returns combined filters with AND operator', () => {
      const result = combineFindAttackDiscoveryFilters({
        search: 'malware',
        ids: ['id1', 'id2'],
        status: ['open'],
        connectorNames: ['GPT-4'],
        alertIds: ['alert123'],
        executionUuid: 'execution-456-uuid',
        start: '2024-01-01T00:00:00.000Z',
        end: '2024-12-31T23:59:59.999Z',
      });

      const expectedSearchFilter = `${ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS}: "*malware*" OR ${ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS}: "*malware*" OR ${ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS}: "*malware*" OR ${ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS}: "*malware*"`;
      const expectedResult = `(${expectedSearchFilter}) AND (_id: "id1" OR _id: "id2") AND (${ALERT_WORKFLOW_STATUS}: "open") AND (${ALERT_ATTACK_DISCOVERY_API_CONFIG_NAME}: "GPT-4") AND (${ALERT_ATTACK_DISCOVERY_ALERT_IDS}: "alert123") AND kibana.alert.rule.execution.uuid: "execution-456-uuid" AND @timestamp >= "2024-01-01T00:00:00.000Z" AND @timestamp <= "2024-12-31T23:59:59.999Z"`;

      expect(result).toBe(expectedResult);
    });

    it('returns combined filters excluding empty arrays and undefined values', () => {
      const result = combineFindAttackDiscoveryFilters({
        search: 'test',
        ids: [],
        status: ['open'],
        connectorNames: undefined,
        alertIds: ['alert123'],
        executionUuid: undefined,
        start: undefined,
        end: '2024-12-31T23:59:59.999Z',
      });

      const expectedSearchFilter = `${ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS}: "*test*" OR ${ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS}: "*test*" OR ${ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS}: "*test*" OR ${ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS}: "*test*"`;
      const expectedResult = `(${expectedSearchFilter}) AND (${ALERT_WORKFLOW_STATUS}: "open") AND (${ALERT_ATTACK_DISCOVERY_ALERT_IDS}: "alert123") AND @timestamp <= "2024-12-31T23:59:59.999Z"`;

      expect(result).toBe(expectedResult);
    });
  });
});
