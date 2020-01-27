/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

const TEST_START_TIME = encodeURIComponent('2015-09-19T06:31:44.000');
const TEST_END_TIME = encodeURIComponent('2015-09-23T18:31:44.000');
const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

const fieldsWithData = [
  '@message',
  '@message.raw',
  '@tags',
  '@tags.raw',
  '@timestamp',
  'agent',
  'agent.raw',
  'bytes',
  'clientip',
  'extension',
  'extension.raw',
  'geo.coordinates',
  'geo.dest',
  'geo.src',
  'geo.srcdest',
  'headings',
  'headings.raw',
  'host',
  'host.raw',
  'index',
  'index.raw',
  'ip',
  'links',
  'links.raw',
  'machine.os',
  'machine.os.raw',
  'machine.ram',
  'memory',
  'phpmemory',
  'referer',
  'request',
  'request.raw',
  'response',
  'response.raw',
  'spaces',
  'spaces.raw',
  'type',
  'url',
  'url.raw',
  'utc_time',
  'xss',
  'xss.raw',

  'relatedContent.article:modified_time',
  'relatedContent.article:published_time',
  'relatedContent.article:section',
  'relatedContent.article:section.raw',
  'relatedContent.article:tag',
  'relatedContent.article:tag.raw',
  'relatedContent.og:description',
  'relatedContent.og:description.raw',
  'relatedContent.og:image',
  'relatedContent.og:image.raw',
  'relatedContent.og:image:height',
  'relatedContent.og:image:height.raw',
  'relatedContent.og:image:width',
  'relatedContent.og:image:width.raw',
  'relatedContent.og:site_name',
  'relatedContent.og:site_name.raw',
  'relatedContent.og:title',
  'relatedContent.og:title.raw',
  'relatedContent.og:type',
  'relatedContent.og:type.raw',
  'relatedContent.og:url',
  'relatedContent.og:url.raw',
  'relatedContent.twitter:card',
  'relatedContent.twitter:card.raw',
  'relatedContent.twitter:description',
  'relatedContent.twitter:description.raw',
  'relatedContent.twitter:image',
  'relatedContent.twitter:image.raw',
  'relatedContent.twitter:site',
  'relatedContent.twitter:site.raw',
  'relatedContent.twitter:title',
  'relatedContent.twitter:title.raw',
  'relatedContent.url',
  'relatedContent.url.raw',
];

const metricBeatData = [
  '@timestamp',
  'agent.ephemeral_id',
  'agent.hostname',
  'agent.id',
  'agent.type',
  'agent.version',
  'ecs.version',
  'event.dataset',
  'event.duration',
  'event.module',
  'host.architecture',
  'host.hostname',
  'host.id',
  'host.name',
  'host.os.build',
  'host.os.family',
  'host.os.kernel',
  'host.os.name',
  'host.os.platform',
  'host.os.version',
  'metricset.name',
  'service.type',
  'system.cpu.cores',
  'system.cpu.idle.pct',
  'system.cpu.iowait.pct',
  'system.cpu.irq.pct',
  'system.cpu.nice.pct',
  'system.cpu.softirq.pct',
  'system.cpu.steal.pct',
  'system.cpu.system.pct',
  'system.cpu.total.pct',
  'system.cpu.user.pct',
];

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('existing_fields apis', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('visualize/default');
    });
    after(async () => {
      await esArchiver.unload('logstash_functional');
      await esArchiver.unload('visualize/default');
    });

    describe('existence', () => {
      it('should find which fields exist in the sample documents', async () => {
        const { body } = await supertest
          .get(
            `/api/lens/existing_fields/${encodeURIComponent(
              'logstash-*'
            )}?fromDate=${TEST_START_TIME}&toDate=${TEST_END_TIME}`
          )
          .set(COMMON_HEADERS)
          .expect(200);

        expect(body.indexPatternTitle).to.eql('logstash-*');
        expect(body.existingFieldNames.sort()).to.eql(fieldsWithData.sort());
      });

      it('should succeed for thousands of fields', async () => {
        const { body } = await supertest
          .get(
            `/api/lens/existing_fields/${encodeURIComponent(
              'metricbeat-*'
            )}?fromDate=${TEST_START_TIME}&toDate=${TEST_END_TIME}`
          )
          .set(COMMON_HEADERS)
          .expect(200);

        expect(body.indexPatternTitle).to.eql('metricbeat-*');
        expect(body.existingFieldNames.sort()).to.eql(metricBeatData.sort());
      });

      it('should throw a 404 for a non-existent index', async () => {
        await supertest
          .get(
            `/api/lens/existing_fields/nadachance?fromDate=${TEST_START_TIME}&toDate=${TEST_END_TIME}`
          )
          .set(COMMON_HEADERS)
          .expect(404);
      });
    });
  });
};
