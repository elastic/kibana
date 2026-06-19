/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { NewTermsRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getCreateNewTermsRulesSchemaMock } from '@kbn/security-solution-plugin/common/api/detection_engine/model/rule_schema/mocks';

import { deleteAllRules, deleteAllAlerts } from '@kbn/detections-response-ftr-services';
import { getPreviewAlerts, previewRule, dataGeneratorFactory } from '../../../../utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

const NESTED_INDEX = 'new-terms-nested-test';
const FLATTENED_INDEX = 'new-terms-flattened-test';

const historicalWindowStart = '2022-10-13T05:00:04.000Z';
const ruleExecutionStart = '2022-10-19T05:00:04.000Z';
const recentDocTimestamp = '2022-10-19T05:00:05.000Z';

/**
 * These tests cover how the new terms rule handles `nested` and `flattened` field types,
 * which ES|QL cannot read (the columns resolve to "Unknown column").
 *
 * The executor detects these field types via field_caps and falls back to the aggregation
 * approach instead of running ES|QL. The two field types then behave differently:
 *
 * - `flattened` subfields (e.g. `labels.env`) are aggregatable keywords, so the aggregation
 *   fallback resolves them and produces alerts. This is where the fallback adds value.
 * - `nested` fields are not readable by a plain terms aggregation either (they require a
 *   `nested` aggregation wrapper, which the new terms aggregation path does not use), so they
 *   produce no alerts. This matches the pre-ES|QL behavior, i.e. nested fields were never
 *   supported, so there is no regression.
 */
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  const { indexListOfDocuments: indexNestedDocs } = dataGeneratorFactory({
    es,
    index: NESTED_INDEX,
    log,
  });

  const { indexListOfDocuments: indexFlattenedDocs } = dataGeneratorFactory({
    es,
    index: FLATTENED_INDEX,
    log,
  });

  describe('@ess @serverless @serverlessQA New terms ES|QL approach - field type limitations', () => {
    before(async () => {
      await es.indices.delete({
        index: `${NESTED_INDEX},${FLATTENED_INDEX}`,
        ignore_unavailable: true,
      });

      const nestedMappings: MappingTypeMapping = {
        properties: {
          '@timestamp': { type: 'date' },
          id: { type: 'keyword' },
          host: {
            properties: {
              name: { type: 'keyword' },
            },
          },
          user: {
            type: 'nested',
            properties: {
              name: { type: 'keyword' },
              id: { type: 'keyword' },
            },
          },
          process: {
            type: 'nested',
            properties: {
              name: { type: 'keyword' },
              pid: { type: 'long' },
            },
          },
        },
      };

      const flattenedMappings: MappingTypeMapping = {
        properties: {
          '@timestamp': { type: 'date' },
          id: { type: 'keyword' },
          host: {
            properties: {
              name: { type: 'keyword' },
            },
          },
          labels: { type: 'flattened' },
        },
      };

      await es.indices.create({ index: NESTED_INDEX, mappings: nestedMappings });
      await es.indices.create({ index: FLATTENED_INDEX, mappings: flattenedMappings });
    });

    after(async () => {
      await es.indices.delete({
        index: `${NESTED_INDEX},${FLATTENED_INDEX}`,
        ignore_unavailable: true,
      });
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    describe('nested fields - unsupported by both ES|QL and aggregation paths', () => {
      // Data setup:
      //   Historical: host-0 with user admin, host-1 with user root
      //   Recent:     host-0 with user admin (known), host-new with user attacker (NEW)
      //
      // A new value (attacker) clearly exists, but nested fields are invisible to ES|QL
      // ("Unknown column") and to a plain terms aggregation (no `nested` agg wrapper). The
      // executor falls back to the aggregation path, which also returns 0 alerts. This is
      // consistent with the pre-ES|QL behavior: nested fields were never supported.
      before(async () => {
        const historicalDocs = [
          {
            '@timestamp': '2022-10-14T05:00:04.000Z',
            host: { name: 'host-0' },
            user: [{ name: 'admin', id: 'u1' }],
            process: [{ name: 'sshd', pid: 1234 }],
          },
          {
            '@timestamp': '2022-10-14T05:00:04.000Z',
            host: { name: 'host-1' },
            user: [{ name: 'root', id: 'u2' }],
            process: [{ name: 'bash', pid: 5678 }],
          },
        ];

        const recentDocs = [
          {
            '@timestamp': recentDocTimestamp,
            host: { name: 'host-0' },
            user: [{ name: 'admin', id: 'u1' }],
            process: [{ name: 'sshd', pid: 1234 }],
          },
          {
            '@timestamp': recentDocTimestamp,
            host: { name: 'host-new' },
            user: [{ name: 'attacker', id: 'u3' }],
            process: [{ name: 'nc', pid: 6666 }],
          },
        ];

        await indexNestedDocs([...historicalDocs, ...recentDocs]);
      });

      it('sanity check: non-nested field in same index works correctly', async () => {
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          index: [NESTED_INDEX],
          new_terms_fields: ['host.name'],
          from: ruleExecutionStart,
          history_window_start: historicalWindowStart,
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toEqual(1);
        expect(previewAlerts[0]._source?.['kibana.alert.new_terms']).toEqual(['host-new']);
      });

      it('does not alert on a new nested field value - user.name "attacker" produces 0 alerts', async () => {
        // user.name is mapped as nested. A new value "attacker" appears in the recent window,
        // but ES|QL reports it as an "Unknown column" so the executor falls back to the
        // aggregation path, which also cannot read nested fields. Result: 0 alerts.
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          index: [NESTED_INDEX],
          new_terms_fields: ['user.name'],
          from: ruleExecutionStart,
          history_window_start: historicalWindowStart,
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toEqual(0);
      });

      it('does not alert on a new combination when one field is nested - host.name+user.name produces 0 alerts', async () => {
        // The combination (host-new, attacker) is new, but because user.name is nested the
        // executor falls back to the aggregation path for the whole rule, and that path cannot
        // read the nested field either. Result: 0 alerts.
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          index: [NESTED_INDEX],
          new_terms_fields: ['host.name', 'user.name'],
          from: ruleExecutionStart,
          history_window_start: historicalWindowStart,
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toEqual(0);
      });

      it('does not alert on a new nested process.name value - "nc" produces 0 alerts', async () => {
        // process.name is nested. "nc" only appears in the recent window, but neither the ES|QL
        // path nor the aggregation fallback can read nested fields. Result: 0 alerts.
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          index: [NESTED_INDEX],
          new_terms_fields: ['process.name'],
          from: ruleExecutionStart,
          history_window_start: historicalWindowStart,
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toEqual(0);
      });
    });

    describe('flattened fields - ES|QL cannot resolve flattened subfield columns', () => {
      // Data setup:
      //   Historical: host-0 with labels.env=production, host-1 with labels.env=staging
      //   Recent:     host-0 with labels.env=production (known), host-new with labels.env=development (NEW)
      //
      // Expected with aggregation approach: 1 alert for labels.env=development
      // Actual with ES|QL approach: 0 alerts (flattened subfields are unsupported)
      before(async () => {
        const historicalDocs = [
          {
            '@timestamp': '2022-10-14T05:00:04.000Z',
            host: { name: 'host-0' },
            labels: { env: 'production', team: 'security' },
          },
          {
            '@timestamp': '2022-10-14T05:00:04.000Z',
            host: { name: 'host-1' },
            labels: { env: 'staging', team: 'platform' },
          },
        ];

        const recentDocs = [
          {
            '@timestamp': recentDocTimestamp,
            host: { name: 'host-0' },
            labels: { env: 'production', team: 'security' },
          },
          {
            '@timestamp': recentDocTimestamp,
            host: { name: 'host-new' },
            labels: { env: 'development', team: 'attackers' },
          },
        ];

        await indexFlattenedDocs([...historicalDocs, ...recentDocs]);
      });

      it('sanity check: non-flattened field in same index works correctly', async () => {
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          index: [FLATTENED_INDEX],
          new_terms_fields: ['host.name'],
          from: ruleExecutionStart,
          history_window_start: historicalWindowStart,
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toEqual(1);
        expect(previewAlerts[0]._source?.['kibana.alert.new_terms']).toEqual(['host-new']);
      });

      it('misses new flattened subfield value - labels.env "development" is new but ES|QL produces 0 alerts', async () => {
        // labels is mapped as flattened. labels.env subfield is aggregatable as keyword
        // in the aggregation approach (terms agg resolves it). ES|QL can't resolve
        // flattened subfield columns — they're treated as unsupported/unknown.
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          index: [FLATTENED_INDEX],
          new_terms_fields: ['labels.env'],
          from: ruleExecutionStart,
          history_window_start: historicalWindowStart,
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toEqual(1);
        expect(previewAlerts[0]._source?.['kibana.alert.new_terms']).toEqual(['development']);
      });

      it('misses new combination when one field is flattened - host.name+labels.env combo is new but ES|QL produces 0 alerts', async () => {
        // (host-new, development) is a new combination. But labels.env can't be resolved
        // as an ES|QL column, so the WHERE null filter or STATS BY produces nothing.
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          index: [FLATTENED_INDEX],
          new_terms_fields: ['host.name', 'labels.env'],
          from: ruleExecutionStart,
          history_window_start: historicalWindowStart,
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toEqual(1);
        expect(previewAlerts[0]._source?.['kibana.alert.new_terms']).toEqual([
          'host-new',
          'development',
        ]);
      });

      it('misses new flattened subfield value - labels.team "attackers" is new but ES|QL produces 0 alerts', async () => {
        // Second flattened subfield to confirm the issue isn't specific to one subfield name.
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          index: [FLATTENED_INDEX],
          new_terms_fields: ['labels.team'],
          from: ruleExecutionStart,
          history_window_start: historicalWindowStart,
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toEqual(1);
        expect(previewAlerts[0]._source?.['kibana.alert.new_terms']).toEqual(['attackers']);
      });
    });
  });
};
