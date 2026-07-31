/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import {
  alertsIndexPattern,
  DEFAULT_DIAGNOSTIC_INDEX_PATTERN,
  ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
  ENDPOINT_ACTIONS_INDEX,
  ENDPOINT_HEARTBEAT_INDEX_PATTERN,
  eventsIndexPattern,
  FILE_STORAGE_METADATA_INDEX,
  METADATA_UNITED_INDEX,
  metadataCurrentIndexPattern,
  policyIndexPattern,
  telemetryIndexPattern,
} from '../../../common/endpoint/constants';
import { isEndpointIndex, isFleetIndex, shouldUseInternalSearchClient } from './cps_read_routing';

describe('CPS read routing classifiers', () => {
  describe('isFleetIndex()', () => {
    it.each([
      ['fleet agents', '.fleet-agents'],
      ['fleet action results', AGENT_ACTIONS_RESULTS_INDEX],
      ['endpoint file storage, which is Fleet-owned despite the name', FILE_STORAGE_METADATA_INDEX],
    ])('should classify %s as Fleet-owned', (_, index) => {
      expect(isFleetIndex(index)).toBe(true);
    });

    it('should not classify a Defend index as Fleet-owned', () => {
      expect(isFleetIndex(ENDPOINT_ACTIONS_INDEX)).toBe(false);
    });
  });

  describe('isEndpointIndex()', () => {
    it.each([
      ['action requests', ENDPOINT_ACTIONS_INDEX],
      ['action responses', ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN],
      ['events', eventsIndexPattern],
      ['alerts', alertsIndexPattern],
      ['current metadata', metadataCurrentIndexPattern],
      ['united metadata', METADATA_UNITED_INDEX],
      ['policy responses', policyIndexPattern],
    ])('should classify %s as Defend-owned and fan-out eligible', (_, index) => {
      expect(isEndpointIndex(index)).toBe(true);
    });

    it('should classify a CCS-prefixed Defend pattern the same as its unprefixed form', () => {
      expect(isEndpointIndex(`*:${eventsIndexPattern}`)).toBe(true);
    });

    it.each([
      ['heartbeat', ENDPOINT_HEARTBEAT_INDEX_PATTERN],
      ['diagnostics', DEFAULT_DIAGNOSTIC_INDEX_PATTERN],
      ['telemetry', telemetryIndexPattern],
    ])('should exclude the Defend-internal %s index', (_, index) => {
      expect(isEndpointIndex(index)).toBe(false);
    });

    it('should exclude endpoint file storage, which is Fleet-owned', () => {
      expect(isEndpointIndex(FILE_STORAGE_METADATA_INDEX)).toBe(false);
    });
  });

  describe('shouldUseInternalSearchClient()', () => {
    it('should keep every read on the internal client when the read cannot fan out', () => {
      expect(shouldUseInternalSearchClient([ENDPOINT_ACTIONS_INDEX], false)).toBe(true);
    });

    it('should move a Defend-only read to the current user when the read can fan out', () => {
      expect(
        shouldUseInternalSearchClient(
          [ENDPOINT_ACTIONS_INDEX, ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN],
          true
        )
      ).toBe(false);
    });

    it('should keep a read on the internal client when any index in the list is Fleet-owned', () => {
      expect(
        shouldUseInternalSearchClient([ENDPOINT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX], true)
      ).toBe(true);
    });

    it('should keep a read on the internal client when no index in the list is Defend-owned', () => {
      expect(shouldUseInternalSearchClient(['logs-osquery_manager.actions-*'], true)).toBe(true);
    });

    it('should keep a read on the internal client when the index list is empty', () => {
      expect(shouldUseInternalSearchClient([], true)).toBe(true);
    });
  });
});
