/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';

import { QueryRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getPreviewAlerts, previewRule, dataGeneratorFactory } from '../../../../utils';
import {
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
} from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  const getRuleProps = (id: string, index: string): QueryRuleCreateProps => {
    return {
      ...getRuleForAlertTesting([index]),
      query: `id:${id}`,
      from: 'now-1h',
      interval: '1h',
    };
  };

  describe('@ess @serverless synthetic source', () => {
    describe('synthetic source limitations', () => {
      const index = 'ecs_compliant_synthetic_source';
      const { indexListOfDocuments } = dataGeneratorFactory({ es, index, log });

      before(async () => {
        await esArchiver.load(`x-pack/test/functional/es_archives/security_solution/${index}`);
      });

      after(async () => {
        await esArchiver.unload(`x-pack/test/functional/es_archives/security_solution/${index}`);
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should convert dot-notation to nested objects', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:00:00.000Z';

        const firstDoc = {
          id,
          '@timestamp': timestamp,
          'agent.name': 'agent-1',
        };

        await indexListOfDocuments([firstDoc]);

        const { previewId } = await previewRule({
          supertest,
          rule: getRuleProps(id, index),
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 1,
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
        });

        expect(previewAlerts.length).toEqual(1);
        expect(previewAlerts[0]._source).toEqual({
          ...previewAlerts[0]._source,
          // agent.name returned as nested object, but was indexed in original document with dot-notation
          agent: { name: 'agent-1' },
        });
      });

      it('should removed duplicated values in array', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:00:00.000Z';

        const firstDoc = {
          id,
          '@timestamp': timestamp,
          client: { ip: ['127.0.0.1', '127.0.0.1', '127.0.0.2'] },
        };

        await indexListOfDocuments([firstDoc]);

        const { previewId } = await previewRule({
          supertest,
          rule: getRuleProps(id, index),
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 1,
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
        });

        expect(previewAlerts.length).toEqual(1);
        expect(previewAlerts[0]._source).toEqual({
          ...previewAlerts[0]._source,
          client: { ip: ['127.0.0.1', '127.0.0.2'] },
        });
      });

      it('should sort duplicated values in array', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:00:00.000Z';

        const firstDoc = {
          id,
          '@timestamp': timestamp,
          client: { ip: ['127.0.0.3', '211.0.0.2', '127.0.0.1'] },
        };

        await indexListOfDocuments([firstDoc]);

        const { previewId } = await previewRule({
          supertest,
          rule: getRuleProps(id, index),
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 1,
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
        });

        expect(previewAlerts.length).toEqual(1);
        expect(previewAlerts[0]._source).toEqual({
          ...previewAlerts[0]._source,
          client: { ip: ['127.0.0.1', '127.0.0.3', '211.0.0.2'] },
        });
      });

      it('should convert array of objects to leaf structure', async () => {
        const id = uuidv4();
        const timestamp = '2020-10-28T06:00:00.000Z';

        const firstDoc = {
          id,
          '@timestamp': timestamp,
          client: [{ ip: ['127.0.0.1'] }, { ip: ['127.0.0.2'] }],
        };

        await indexListOfDocuments([firstDoc]);

        const { previewId } = await previewRule({
          supertest,
          rule: getRuleProps(id, index),
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 1,
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
        });

        expect(previewAlerts.length).toEqual(1);
        expect(previewAlerts[0]._source).toEqual({
          ...previewAlerts[0]._source,
          client: { ip: ['127.0.0.1', '127.0.0.2'] },
        });
      });
    });

    // this set of tests represent corrected failed test suits in https://github.com/elastic/kibana/pull/191527#issuecomment-2360684346
    // and ensures non-ecs fields are stripped when source mode is synthetic
    describe('non ecs fields', () => {
      const index = 'ecs_non_compliant_synthetic_source';
      const { indexListOfDocuments } = dataGeneratorFactory({ es, index, log });
      const timestamp = '2020-10-28T06:00:00.000Z';

      before(async () => {
        await esArchiver.load(`x-pack/test/functional/es_archives/security_solution/${index}`);
      });

      after(async () => {
        await esArchiver.unload(`x-pack/test/functional/es_archives/security_solution/${index}`);
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should not add multi field .text to ecs compliant flattened source', async () => {
        const id = uuidv4();

        const firstDoc = {
          id,
          '@timestamp': timestamp,
          'process.command_line': 'string longer than 10 characters',
        };

        await indexListOfDocuments([firstDoc]);

        const { previewId } = await previewRule({
          supertest,
          rule: getRuleProps(id, index),
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 1,
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
        });

        expect(previewAlerts[0]?._source?.process).toEqual({
          command_line: 'string longer than 10 characters',
        });
        expect(previewAlerts[0]?._source).not.toHaveProperty('process.command_line.text');
      });

      it('should not add multi field .text to ecs non compliant flattened source', async () => {
        const id = uuidv4();

        const firstDoc = {
          id,
          '@timestamp': timestamp,
          'nonEcs.command_line': 'string longer than 10 characters',
        };

        await indexListOfDocuments([firstDoc]);

        const { previewId } = await previewRule({
          supertest,
          rule: getRuleProps(id, index),
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 1,
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
        });

        expect(previewAlerts[0]?._source?.nonEcs).toEqual({
          command_line: 'string longer than 10 characters',
        });
        expect(previewAlerts[0]?._source).not.toHaveProperty('process.nonEcs.text');
      });

      it('should remove text field if the length of the string is more than 32766 bytes', async () => {
        const id = uuidv4();

        const document = {
          id,
          '@timestamp': timestamp,
          'event.original': 'z'.repeat(32767),
          'event.module': 'z'.repeat(32767),
          'event.action': 'z'.repeat(32767),
        };

        await indexListOfDocuments([document]);

        const { previewId } = await previewRule({
          supertest,
          rule: getRuleProps(id, index),
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 1,
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
        });

        const alertSource = previewAlerts[0]?._source;

        // keywords with `ignore_above` attribute which allows long text to be stored
        expect(alertSource).toHaveProperty(['kibana.alert.original_event.module']);
        expect(alertSource).toHaveProperty(['kibana.alert.original_event.original']);
        expect(alertSource).toHaveProperty(['kibana.alert.original_event.action']);

        expect(alertSource?.event).toHaveProperty(['module']);
        expect(alertSource?.event).toHaveProperty(['original']);
        expect(alertSource?.event).toHaveProperty(['action']);
      });

      it('should not remove valid dates from ECS source field', async () => {
        const id = uuidv4();

        const validDates = [
          '2015-01-01T12:10:30.666Z',
          '2015-01-01T12:10:30.666',
          '2015-01-01T12:10:30Z',
          '2015-01-01T12:10:30',
          '2015-01-01T12:10Z',
          '2015-01-01T12:10',
          '2015-01-01T12Z',
          '2015-01-01T12',
          '2015-01-01',
          '2015-01',
          '2015-01-02T',
          123.3,
          '23242',
          -1,
          '-1',
          0,
          '0',
        ];
        const document = {
          id,
          '@timestamp': timestamp,
          event: {
            created: validDates,
          },
        };
        await indexListOfDocuments([document]);

        const { previewId } = await previewRule({
          supertest,
          rule: getRuleProps(id, index),
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 1,
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
        });

        // array of dates became sorted and duplicates removed
        expect(previewAlerts[0]?._source).toHaveProperty(
          ['event', 'created'],
          [
            '-1',
            '0',
            '123.3',
            '2015-01',
            '2015-01-01',
            '2015-01-01T12',
            '2015-01-01T12:10',
            '2015-01-01T12:10:30',
            '2015-01-01T12:10:30.666',
            '2015-01-01T12:10:30.666Z',
            '2015-01-01T12:10:30Z',
            '2015-01-01T12:10Z',
            '2015-01-01T12Z',
            '2015-01-02T',
            '23242',
          ]
        );
      });

      it('should not remove valid ips from ECS source field', async () => {
        const id = uuidv4();
        const ip = [
          '127.0.0.1',
          '::afff:4567:890a',
          '::',
          '::11.22.33.44',
          '1111:2222:3333:4444:AAAA:BBBB:CCCC:DDDD',
        ];

        const document = {
          id,
          '@timestamp': timestamp,
          client: { ip },
        };
        await indexListOfDocuments([document]);

        const { previewId } = await previewRule({
          supertest,
          rule: getRuleProps(id, index),
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 1,
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
        });

        // array of dates became sorted
        expect(previewAlerts[0]?._source).toHaveProperty('client.ip', [
          '1111:2222:3333:4444:AAAA:BBBB:CCCC:DDDD',
          '127.0.0.1',
          '::',
          '::11.22.33.44',
          '::afff:4567:890a',
        ]);
      });

      it('should remove source array of keywords field from alert if ECS field mapping is nested', async () => {
        const id = uuidv4();

        const document = {
          id,
          '@timestamp': timestamp,
          threat: {
            enrichments: ['non-valid-threat-1', 'non-valid-threat-2'],
            'indicator.port': 443,
          },
        };
        await indexListOfDocuments([document]);

        const { previewId } = await previewRule({
          supertest,
          rule: getRuleProps(id, index),
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 1,
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
        });

        expect(previewAlerts[0]?._source).not.toHaveProperty('threat.enrichments');

        expect(previewAlerts[0]?._source).toHaveProperty(['threat', 'indicator', 'port'], 443);
      });

      it('should strip invalid boolean values and left valid ones', async () => {
        const id = uuidv4();

        const document = {
          id,
          '@timestamp': timestamp,
          dll: {
            code_signature: {
              valid: ['non-valid', 'true', 'false', [true, false], '', 'False', 'True', 1],
            },
          },
        };
        await indexListOfDocuments([document]);

        const { previewId } = await previewRule({
          supertest,
          rule: getRuleProps(id, index),
          timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
          invocationCount: 1,
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
        });

        // invalid ECS values is getting removed, duplicates not stored in synthetic source
        expect(previewAlerts[0]?._source).toHaveProperty('dll.code_signature.valid', [
          '',
          'false',
          'true',
        ]);
      });
    });
  });
};
