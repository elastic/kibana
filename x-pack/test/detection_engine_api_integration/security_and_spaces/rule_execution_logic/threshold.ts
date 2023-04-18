/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ALERT_REASON,
  ALERT_RULE_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_KIND,
} from '@kbn/rule-data-utils';

import { ThresholdRuleCreateProps } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';
import { Ancestor } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/types';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
  ALERT_THRESHOLD_RESULT,
} from '@kbn/security-solution-plugin/common/field_maps/field_names';
import {
  createRule,
  getOpenSignals,
  getPreviewAlerts,
  getThresholdRuleForSignalTesting,
  previewRule,
} from '../../utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  describe('Threshold type rules', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
    });

    // First test creates a real rule - remaining tests use preview API
    it('generates 1 signal from Threshold rules when threshold is met', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForSignalTesting(['auditbeat-*']),
        threshold: {
          field: ['host.id'],
          value: 700,
        },
      };
      const createdRule = await createRule(supertest, log, rule);
      const alerts = await getOpenSignals(supertest, log, es, createdRule);
      expect(alerts.hits.hits.length).eql(1);
      const fullSignal = alerts.hits.hits[0]._source;
      if (!fullSignal) {
        return expect(fullSignal).to.be.ok();
      }
      const eventIds = (fullSignal?.[ALERT_ANCESTORS] as Ancestor[]).map((event) => event.id);
      expect(fullSignal).eql({
        ...fullSignal,
        'host.id': '8cc95778cce5407c809480e8e32ad76b',
        [EVENT_KIND]: 'signal',
        [ALERT_ANCESTORS]: [
          {
            depth: 0,
            id: eventIds[0],
            index: 'auditbeat-*',
            type: 'event',
          },
        ],
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_REASON]: 'event created high alert Signal Testing Query.',
        [ALERT_RULE_UUID]: fullSignal[ALERT_RULE_UUID],
        [ALERT_ORIGINAL_TIME]: fullSignal[ALERT_ORIGINAL_TIME],
        [ALERT_DEPTH]: 1,
        [ALERT_THRESHOLD_RESULT]: {
          terms: [
            {
              field: 'host.id',
              value: '8cc95778cce5407c809480e8e32ad76b',
            },
          ],
          count: 788,
          from: '2019-02-19T07:12:05.332Z',
        },
      });
    });

    it('generates 2 signals from Threshold rules when threshold is met', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForSignalTesting(['auditbeat-*']),
        threshold: {
          field: 'host.id',
          value: 100,
        },
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).eql(2);
    });

    it('applies the provided query before bucketing ', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForSignalTesting(['auditbeat-*']),
        query: 'host.id:"2ab45fc1c41e4c84bbd02202a7e5761f"',
        threshold: {
          field: 'process.name',
          value: 21,
        },
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).eql(1);
    });

    it('generates no signals from Threshold rules when threshold is met and cardinality is not met', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForSignalTesting(['auditbeat-*']),
        threshold: {
          field: 'host.id',
          value: 100,
          cardinality: [
            {
              field: 'destination.ip',
              value: 100,
            },
          ],
        },
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).eql(0);
    });

    it('generates no signals from Threshold rules when cardinality is met and threshold is not met', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForSignalTesting(['auditbeat-*']),
        threshold: {
          field: 'host.id',
          value: 1000,
          cardinality: [
            {
              field: 'destination.ip',
              value: 5,
            },
          ],
        },
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).eql(0);
    });

    it('generates signals from Threshold rules when threshold and cardinality are both met', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForSignalTesting(['auditbeat-*']),
        threshold: {
          field: 'host.id',
          value: 100,
          cardinality: [
            {
              field: 'destination.ip',
              value: 5,
            },
          ],
        },
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).eql(1);
      const fullSignal = previewAlerts[0]._source;
      if (!fullSignal) {
        return expect(fullSignal).to.be.ok();
      }
      const eventIds = (fullSignal?.[ALERT_ANCESTORS] as Ancestor[]).map((event) => event.id);
      expect(fullSignal).eql({
        ...fullSignal,
        'host.id': '8cc95778cce5407c809480e8e32ad76b',
        [EVENT_KIND]: 'signal',
        [ALERT_ANCESTORS]: [
          {
            depth: 0,
            id: eventIds[0],
            index: 'auditbeat-*',
            type: 'event',
          },
        ],
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_REASON]: `event created high alert Signal Testing Query.`,
        [ALERT_RULE_UUID]: fullSignal[ALERT_RULE_UUID],
        [ALERT_ORIGINAL_TIME]: fullSignal[ALERT_ORIGINAL_TIME],
        [ALERT_DEPTH]: 1,
        [ALERT_THRESHOLD_RESULT]: {
          terms: [
            {
              field: 'host.id',
              value: '8cc95778cce5407c809480e8e32ad76b',
            },
          ],
          cardinality: [
            {
              field: 'destination.ip',
              value: 7,
            },
          ],
          count: 788,
          from: '2019-02-19T07:12:05.332Z',
        },
      });
    });

    it('should not generate signals if only one field meets the threshold requirement', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForSignalTesting(['auditbeat-*']),
        threshold: {
          field: ['host.id', 'process.name'],
          value: 22,
        },
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).eql(0);
    });

    it('generates signals from Threshold rules when bucketing by multiple fields', async () => {
      const rule: ThresholdRuleCreateProps = {
        ...getThresholdRuleForSignalTesting(['auditbeat-*']),
        threshold: {
          field: ['host.id', 'process.name', 'event.module'],
          value: 21,
        },
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).eql(1);
      const fullSignal = previewAlerts[0]._source;
      if (!fullSignal) {
        return expect(fullSignal).to.be.ok();
      }
      const eventIds = (fullSignal[ALERT_ANCESTORS] as Ancestor[]).map((event) => event.id);
      expect(fullSignal).eql({
        ...fullSignal,
        'event.module': 'system',
        'host.id': '2ab45fc1c41e4c84bbd02202a7e5761f',
        'process.name': 'sshd',
        [EVENT_KIND]: 'signal',
        [ALERT_ANCESTORS]: [
          {
            depth: 0,
            id: eventIds[0],
            index: 'auditbeat-*',
            type: 'event',
          },
        ],
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_REASON]: `event with process sshd, created high alert Signal Testing Query.`,
        [ALERT_RULE_UUID]: fullSignal[ALERT_RULE_UUID],
        [ALERT_ORIGINAL_TIME]: fullSignal[ALERT_ORIGINAL_TIME],
        [ALERT_DEPTH]: 1,
        [ALERT_THRESHOLD_RESULT]: {
          terms: [
            {
              field: 'host.id',
              value: '2ab45fc1c41e4c84bbd02202a7e5761f',
            },
            {
              field: 'process.name',
              value: 'sshd',
            },
            {
              field: 'event.module',
              value: 'system',
            },
          ],
          count: 21,
          from: '2019-02-19T20:22:03.561Z',
        },
      });
    });

    describe('Timestamp override and fallback', async () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timestamp_fallback'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timestamp_fallback'
        );
      });

      it('applies timestamp override when using single field', async () => {
        const rule: ThresholdRuleCreateProps = {
          ...getThresholdRuleForSignalTesting(['timestamp-fallback-test']),
          threshold: {
            field: 'host.name',
            value: 1,
          },
          timestamp_override: 'event.ingested',
        };
        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts.length).eql(4);

        for (const hit of previewAlerts) {
          const originalTime = hit._source?.[ALERT_ORIGINAL_TIME];
          const hostName = hit._source?.['host.name'];
          if (hostName === 'host-1') {
            expect(originalTime).eql('2020-12-16T15:15:18.570Z');
          } else if (hostName === 'host-2') {
            expect(originalTime).eql('2020-12-16T15:16:18.570Z');
          } else if (hostName === 'host-3') {
            expect(originalTime).eql('2020-12-16T16:15:18.570Z');
          } else {
            expect(originalTime).eql('2020-12-16T16:16:18.570Z');
          }
        }
      });

      it('applies timestamp override when using multiple fields', async () => {
        const rule: ThresholdRuleCreateProps = {
          ...getThresholdRuleForSignalTesting(['timestamp-fallback-test']),
          threshold: {
            field: ['host.name', 'source.ip'],
            value: 1,
          },
          timestamp_override: 'event.ingested',
        };
        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts.length).eql(4);

        for (const hit of previewAlerts) {
          const originalTime = hit._source?.[ALERT_ORIGINAL_TIME];
          const hostName = hit._source?.['host.name'];
          if (hostName === 'host-1') {
            expect(originalTime).eql('2020-12-16T15:15:18.570Z');
          } else if (hostName === 'host-2') {
            expect(originalTime).eql('2020-12-16T15:16:18.570Z');
          } else if (hostName === 'host-3') {
            expect(originalTime).eql('2020-12-16T16:15:18.570Z');
          } else {
            expect(originalTime).eql('2020-12-16T16:16:18.570Z');
          }
        }
      });
    });

    describe('with host risk index', async () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/entity/host_risk');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/entity/host_risk');
      });

      it('should be enriched with host risk score', async () => {
        const rule: ThresholdRuleCreateProps = {
          ...getThresholdRuleForSignalTesting(['auditbeat-*']),
          threshold: {
            field: 'host.name',
            value: 100,
          },
        };
        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId, sort: ['host.name'] });

        expect(previewAlerts[0]?._source?.host?.risk?.calculated_level).to.eql('Low');
        expect(previewAlerts[0]?._source?.host?.risk?.calculated_score_norm).to.eql(20);
        expect(previewAlerts[1]?._source?.host?.risk?.calculated_level).to.eql('Critical');
        expect(previewAlerts[1]?._source?.host?.risk?.calculated_score_norm).to.eql(96);
      });
    });
  });
};
