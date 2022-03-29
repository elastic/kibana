/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

const TEST_START_TIME = '2015-09-19T06:31:44.000';
const TEST_END_TIME = '2015-09-23T18:31:44.000';
const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

const fieldsWithData = [
  '@message',
  '@message.raw',
  '@tags',
  '@tags.raw',
  '@timestamp',
  '_id',
  '_index',
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
  'machine.ram_range',
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
  'runtime_number',

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
  '_id',
  '_index',
  'agent.ephemeral_id',
  'agent.ephemeral_id.keyword',
  'agent.hostname',
  'agent.hostname.keyword',
  'agent.id',
  'agent.id.keyword',
  'agent.type',
  'agent.type.keyword',
  'agent.version',
  'agent.version.keyword',
  'ecs.version',
  'ecs.version.keyword',
  'event.dataset',
  'event.dataset.keyword',
  'event.duration',
  'event.module',
  'event.module.keyword',
  'host.architecture',
  'host.architecture.keyword',
  'host.hostname',
  'host.hostname.keyword',
  'host.id',
  'host.id.keyword',
  'host.name',
  'host.name.keyword',
  'host.os.build',
  'host.os.build.keyword',
  'host.os.family',
  'host.os.family.keyword',
  'host.os.kernel',
  'host.os.kernel.keyword',
  'host.os.name',
  'host.os.name.keyword',
  'host.os.platform',
  'host.os.platform.keyword',
  'host.os.version',
  'host.os.version.keyword',
  'metricset.name',
  'metricset.name.keyword',
  'service.type',
  'service.type.keyword',
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

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('existing_fields apis legacy', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/visualize/default'
      );
      await kibanaServer.uiSettings.update({
        'lens:useFieldExistenceSampling': true,
      });
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.update({
        'lens:useFieldExistenceSampling': false,
      });
    });

    describe('existence', () => {
      it('should find which fields exist in the sample documents', async () => {
        const { body } = await supertest
          .post(`/api/lens/existing_fields/${encodeURIComponent('logstash-*')}`)
          .set(COMMON_HEADERS)
          .send({
            dslQuery: {
              bool: {
                filter: [{ match_all: {} }],
              },
            },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
          })
          .expect(200);

        expect(body.indexPatternTitle).to.eql('logstash-*');
        expect(body.existingFieldNames.sort()).to.eql(fieldsWithData.sort());
      });

      it('should succeed for thousands of fields', async () => {
        const { body } = await supertest
          .post(`/api/lens/existing_fields/${encodeURIComponent('metricbeat-*')}`)
          .set(COMMON_HEADERS)
          .send({
            dslQuery: { match_all: {} },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
          })
          .expect(200);

        expect(body.indexPatternTitle).to.eql('metricbeat-*');
        expect(body.existingFieldNames.sort()).to.eql(metricBeatData.sort());
      });

      it('should return fields filtered by query and filters', async () => {
        const expectedFieldNames = [
          '@message',
          '@message.raw',
          '@tags',
          '@tags.raw',
          '@timestamp',
          '_id',
          '_index',
          'agent',
          'agent.raw',
          'bytes',
          'clientip',
          'extension',
          'extension.raw',
          'headings',
          'headings.raw',
          'host',
          'host.raw',
          'index',
          'index.raw',
          'referer',
          'request',
          'request.raw',
          'response',
          'response.raw',
          'runtime_number',
          'spaces',
          'spaces.raw',
          'type',
          'url',
          'url.raw',
          'utc_time',
          'xss',
          'xss.raw',
        ];

        const { body } = await supertest
          .post(`/api/lens/existing_fields/${encodeURIComponent('logstash-*')}`)
          .set(COMMON_HEADERS)
          .send({
            dslQuery: {
              bool: {
                filter: [{ match: { referer: 'https://www.taylorswift.com/' } }],
              },
            },
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
          })
          .expect(200);
        expect(body.existingFieldNames.sort()).to.eql(expectedFieldNames.sort());
      });
    });
  });
};
