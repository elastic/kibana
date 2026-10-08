/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import {
  decodeFlyoutV2UrlParam,
  encodeFlyoutV2UrlParam,
  FLYOUT_V2_URL_PARAM,
  FLYOUT_V2_TIMELINE_URL_PARAM,
  urlParamKeyForHistoryKey,
  type FlyoutV2UrlParamValue,
} from './flyout_v2_url_param';
import { documentFlyoutHistoryKey, timelineFlyoutHistoryKey } from '../constants/flyout_history';

describe('flyoutV2 URL param', () => {
  describe('constants', () => {
    it('exports the correct param name', () => {
      expect(FLYOUT_V2_URL_PARAM).toBe('flyoutV2');
    });

    it('exports the correct timeline param name', () => {
      expect(FLYOUT_V2_TIMELINE_URL_PARAM).toBe('flyoutV2Timeline');
    });
  });

  describe('urlParamKeyForHistoryKey', () => {
    it('returns the Timeline param key for timelineFlyoutHistoryKey', () => {
      expect(urlParamKeyForHistoryKey(timelineFlyoutHistoryKey)).toBe(FLYOUT_V2_TIMELINE_URL_PARAM);
    });

    it('returns the page param key for documentFlyoutHistoryKey', () => {
      expect(urlParamKeyForHistoryKey(documentFlyoutHistoryKey)).toBe(FLYOUT_V2_URL_PARAM);
    });

    it('returns the page param key for any other symbol', () => {
      expect(urlParamKeyForHistoryKey(Symbol('other'))).toBe(FLYOUT_V2_URL_PARAM);
    });
  });

  describe('encodeFlyoutV2UrlParam', () => {
    it('encodes a single document descriptor', () => {
      const value: FlyoutV2UrlParamValue = [
        { kind: 'document', documentId: 'abc', indexName: 'logs-*' },
      ];
      const encoded = encodeFlyoutV2UrlParam(value);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('encodes a two-entry chain (tool + child)', () => {
      const value: FlyoutV2UrlParamValue = [
        { kind: 'analyzer', documentId: 'abc', indexName: 'logs-*' },
        { kind: 'document', documentId: 'abc', indexName: 'logs-*' },
      ];
      const encoded = encodeFlyoutV2UrlParam(value);
      expect(typeof encoded).toBe('string');
    });
  });

  describe('decodeFlyoutV2UrlParam', () => {
    it('returns null for null input', () => {
      expect(decodeFlyoutV2UrlParam(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(decodeFlyoutV2UrlParam(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(decodeFlyoutV2UrlParam('')).toBeNull();
    });

    it('returns null for malformed rison', () => {
      expect(decodeFlyoutV2UrlParam('not-rison-!!!')).toBeNull();
    });

    it('returns null for a rison object (not array)', () => {
      const raw = encode({ kind: 'document', documentId: 'abc', indexName: 'logs-*' });
      expect(decodeFlyoutV2UrlParam(raw)).toBeNull();
    });

    it('returns null for an empty array', () => {
      const raw = encode([]);
      expect(decodeFlyoutV2UrlParam(raw)).toBeNull();
    });

    it('returns null when an entry has an unknown kind', () => {
      const raw = encode([{ kind: 'unknownKind', documentId: 'abc' }]);
      expect(decodeFlyoutV2UrlParam(raw)).toBeNull();
    });

    it('returns null when an entry is null', () => {
      const raw = encode([null]);
      expect(decodeFlyoutV2UrlParam(raw)).toBeNull();
    });

    it('returns null when an entry is a primitive (not an object)', () => {
      const raw = encode(['hello']);
      expect(decodeFlyoutV2UrlParam(raw)).toBeNull();
    });

    it('returns null when an entry is a nested array', () => {
      const raw = encode([[{ kind: 'document' }]]);
      expect(decodeFlyoutV2UrlParam(raw)).toBeNull();
    });

    it('never throws on any input', () => {
      const inputs = [null, undefined, '', 'garbage', '!@#$', '()', '!()'];
      for (const input of inputs) {
        expect(() => decodeFlyoutV2UrlParam(input)).not.toThrow();
      }
    });
  });

  describe('round-trip: single descriptor', () => {
    it.each([
      ['document', { kind: 'document' as const, documentId: 'doc1', indexName: 'logs-*' }],
      [
        'documentFromPattern',
        {
          kind: 'documentFromPattern' as const,
          documentId: 'doc1',
          indexName: 'logs-*,.siem-signals-*',
        },
      ],
      ['analyzer', { kind: 'analyzer' as const, documentId: 'doc1', indexName: 'idx' }],
      [
        'sessionView',
        {
          kind: 'sessionView' as const,
          documentId: 'd',
          indexName: 'i',
          jumpToCursor: 'c',
          jumpToEntityId: 'e',
        },
      ],
      [
        'documentEntities',
        { kind: 'documentEntities' as const, documentId: 'd', indexName: 'i', scopeId: 's' },
      ],
      [
        'documentCorrelations',
        {
          kind: 'documentCorrelations' as const,
          documentId: 'd',
          indexName: 'i',
          scopeId: 's',
          isRulePreview: false,
        },
      ],
      [
        'documentPrevalence',
        {
          kind: 'documentPrevalence' as const,
          documentId: 'd',
          indexName: 'i',
          scopeId: 's',
          investigationFields: ['host.name'],
        },
      ],
      ['documentResponse', { kind: 'documentResponse' as const, documentId: 'd', indexName: 'i' }],
      [
        'documentThreatIntelligence',
        { kind: 'documentThreatIntelligence' as const, documentId: 'd', indexName: 'i' },
      ],
      [
        'documentInvestigationGuide',
        { kind: 'documentInvestigationGuide' as const, documentId: 'd', indexName: 'i' },
      ],
      ['documentGraph', { kind: 'documentGraph' as const, documentId: 'd', indexName: 'i' }],
      ['notes', { kind: 'notes' as const, documentId: 'd', indexName: 'i' }],
      ['attack', { kind: 'attack' as const, attackId: 'a1', indexName: '.alerts-*' }],
      [
        'attackCorrelations',
        {
          kind: 'attackCorrelations' as const,
          attackId: 'a1',
          indexName: '.alerts-*',
          alertIds: ['id1', 'id2'],
        },
      ],
      [
        'attackEntities',
        {
          kind: 'attackEntities' as const,
          attackId: 'a1',
          indexName: '.alerts-*',
          alertIds: ['id1'],
        },
      ],
      ['host', { kind: 'host' as const, hostName: 'my-host', entityId: 'eid', scopeId: 's' }],
      ['user', { kind: 'user' as const, userName: 'alice', entityId: 'eid' }],
      ['service', { kind: 'service' as const, serviceName: 'api', entityId: 'eid', scopeId: 's' }],
      [
        'genericEntity',
        { kind: 'genericEntity' as const, scopeId: 's', entityId: 'eid', entityDocId: 'docid' },
      ],
      [
        'entityRiskInputs',
        {
          kind: 'entityRiskInputs' as const,
          entityType: 'host',
          entityName: 'my-host',
          entityId: 'eid',
        },
      ],
      [
        'entityAnomalyInsights',
        {
          kind: 'entityAnomalyInsights' as const,
          entityType: 'user',
          value: 'alice',
          entityId: 'eid',
        },
      ],
      [
        'entityAlertsInsights',
        { kind: 'entityAlertsInsights' as const, entityType: 'host', value: 'h', entityId: 'eid' },
      ],
      [
        'entityMisconfigurationInsights',
        { kind: 'entityMisconfigurationInsights' as const, entityType: 'host', value: 'h' },
      ],
      [
        'entityVulnerabilityInsights',
        { kind: 'entityVulnerabilityInsights' as const, value: 'h', entityType: 'host' },
      ],
      [
        'entityGraphView',
        { kind: 'entityGraphView' as const, entityId: 'eid', scopeId: 's', entityName: 'n' },
      ],
      [
        'entityResolution',
        {
          kind: 'entityResolution' as const,
          entityId: 'eid',
          entityType: 'host',
          entityName: 'n',
          scopeId: 's',
        },
      ],
      [
        'entityEntraInsights',
        {
          kind: 'entityEntraInsights' as const,
          managedUserId: 'mid',
          managedUserIndex: 'idx',
          value: 'alice',
        },
      ],
      [
        'entityOktaInsights',
        {
          kind: 'entityOktaInsights' as const,
          managedUserId: 'mid',
          managedUserIndex: 'idx',
          value: 'alice',
        },
      ],
      ['network', { kind: 'network' as const, ip: '1.2.3.4', flowTarget: 'source' }],
      ['rule', { kind: 'rule' as const, ruleId: 'r1' }],
      ['ioc', { kind: 'ioc' as const, indicatorId: 'iid', indicatorIndex: 'ti-*' }],
      [
        'cspMisconfiguration',
        { kind: 'cspMisconfiguration' as const, resourceId: 'res1', ruleId: 'csp-rule-1' },
      ],
      [
        'cspVulnerability',
        {
          kind: 'cspVulnerability' as const,
          vulnerabilityId: 'CVE-2021-44228',
          resourceId: 'res2',
          packageName: 'log4j',
          packageVersion: '2.14.1',
          eventId: 'ev1',
        },
      ],
    ])('round-trips a %s descriptor', (_name, descriptor) => {
      const value: FlyoutV2UrlParamValue = [descriptor];
      const encoded = encodeFlyoutV2UrlParam(value);
      const decoded = decodeFlyoutV2UrlParam(encoded);
      expect(decoded).toEqual(value);
    });
  });

  describe('round-trip: two-entry chain', () => {
    it('round-trips [tool, child] — analyzer + document', () => {
      const value: FlyoutV2UrlParamValue = [
        { kind: 'analyzer', documentId: 'doc1', indexName: 'logs-*' },
        { kind: 'document', documentId: 'doc1', indexName: 'logs-*' },
      ];
      const encoded = encodeFlyoutV2UrlParam(value);
      const decoded = decodeFlyoutV2UrlParam(encoded);
      expect(decoded).toEqual(value);
    });

    it('round-trips [attack tool, attack child]', () => {
      const value: FlyoutV2UrlParamValue = [
        { kind: 'attackCorrelations', attackId: 'a1', indexName: '.alerts-*', alertIds: ['x'] },
        { kind: 'attack', attackId: 'a1', indexName: '.alerts-*' },
      ];
      const encoded = encodeFlyoutV2UrlParam(value);
      const decoded = decodeFlyoutV2UrlParam(encoded);
      expect(decoded).toEqual(value);
    });

    it('preserves array order (first entry is the tool, second is the child)', () => {
      const tool = { kind: 'sessionView' as const, documentId: 'd', indexName: 'i' };
      const child = { kind: 'document' as const, documentId: 'd', indexName: 'i' };
      const value: FlyoutV2UrlParamValue = [tool, child];
      const decoded = decodeFlyoutV2UrlParam(encodeFlyoutV2UrlParam(value));
      expect(decoded![0].kind).toBe('sessionView');
      expect(decoded![1].kind).toBe('document');
    });
  });
});
