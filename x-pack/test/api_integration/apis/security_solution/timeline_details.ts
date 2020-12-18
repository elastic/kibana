/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import { TimelineEventsQueries } from '../../../../plugins/security_solution/common/search_strategy';

import { FtrProviderContext } from '../../ftr_provider_context';

// typical values that have to change after an update from "scripts/es_archiver"
const INDEX_NAME = 'filebeat-7.0.0-iot-2019.06';
const ID = 'QRhG1WgBqd-n62SwZYDT';
const EXPECTED_DATA = [
  {
    category: 'file',
    field: 'file.path',
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
    originalValue: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
  },
  {
    category: 'traefik',
    field: 'traefik.access.geoip.region_iso_code',
    values: ['US-WA'],
    originalValue: ['US-WA'],
  },
  {
    category: 'host',
    field: 'host.hostname',
    values: ['raspberrypi'],
    originalValue: ['raspberrypi'],
  },
  {
    category: 'traefik',
    field: 'traefik.access.geoip.location',
    values: ['{"long":-122.3341,"lat":47.6103}'],
    originalValue: ['[{"coordinates":[-122.3341,47.6103],"type":"Point"}]'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.src_port',
    values: ['80'],
    originalValue: ['80'],
  },
  {
    category: 'traefik',
    field: 'traefik.access.geoip.city_name',
    values: ['Seattle'],
    originalValue: ['Seattle'],
  },
  {
    category: 'service',
    field: 'service.type',
    values: ['suricata'],
    originalValue: ['suricata'],
  },
  {
    category: 'http',
    field: 'http.request.method',
    values: ['get'],
    originalValue: ['get'],
  },
  {
    category: 'host',
    field: 'host.os.version',
    values: ['9 (stretch)'],
    originalValue: ['9 (stretch)'],
  },
  {
    category: 'source',
    field: 'source.geo.region_name',
    values: ['Washington'],
    originalValue: ['Washington'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.http.protocol',
    values: ['HTTP/1.1'],
    originalValue: ['HTTP/1.1'],
  },
  {
    category: 'host',
    field: 'host.os.name',
    values: ['Raspbian GNU/Linux'],
    originalValue: ['Raspbian GNU/Linux'],
  },
  {
    category: 'source',
    field: 'source.ip',
    values: ['54.239.219.210'],
    originalValue: ['54.239.219.210'],
  },
  {
    category: 'host',
    field: 'host.name',
    values: ['raspberrypi'],
    originalValue: ['raspberrypi'],
  },
  {
    category: 'source',
    field: 'source.geo.region_iso_code',
    values: ['US-WA'],
    originalValue: ['US-WA'],
  },
  {
    category: 'http',
    field: 'http.response.status_code',
    values: ['206'],
    originalValue: ['206'],
  },
  {
    category: 'event',
    field: 'event.kind',
    values: ['event'],
    originalValue: ['event'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.flow_id',
    values: ['196625917175466'],
    originalValue: ['196625917175466'],
  },
  {
    category: 'source',
    field: 'source.geo.city_name',
    values: ['Seattle'],
    originalValue: ['Seattle'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.proto',
    values: ['tcp'],
    originalValue: ['tcp'],
  },
  {
    category: 'flow',
    field: 'flow.locality',
    values: ['public'],
    originalValue: ['public'],
  },
  {
    category: 'traefik',
    field: 'traefik.access.geoip.country_iso_code',
    values: ['US'],
    originalValue: ['US'],
  },
  {
    category: 'fileset',
    field: 'fileset.name',
    values: ['eve'],
    originalValue: ['eve'],
  },
  {
    category: 'input',
    field: 'input.type',
    values: ['log'],
    originalValue: ['log'],
  },
  {
    category: 'log',
    field: 'log.offset',
    values: ['1856288115'],
    originalValue: ['1856288115'],
  },
  {
    category: 'destination',
    field: 'destination.domain',
    values: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
    originalValue: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
  },
  {
    category: 'agent',
    field: 'agent.hostname',
    values: ['raspberrypi'],
    originalValue: ['raspberrypi'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.http.hostname',
    values: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
    originalValue: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.in_iface',
    values: ['eth0'],
    originalValue: ['eth0'],
  },
  {
    category: 'base',
    field: 'tags',
    values: ['suricata'],
    originalValue: ['suricata'],
  },
  {
    category: 'host',
    field: 'host.architecture',
    values: ['armv7l'],
    originalValue: ['armv7l'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.http.status',
    values: ['206'],
    originalValue: ['206'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.http.url',
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
    originalValue: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
  },
  {
    category: 'url',
    field: 'url.path',
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
    originalValue: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
  },
  {
    category: 'source',
    field: 'source.port',
    values: ['80'],
    originalValue: ['80'],
  },
  {
    category: 'agent',
    field: 'agent.id',
    values: ['4d3ea604-27e5-4ec7-ab64-44f82285d776'],
    originalValue: ['4d3ea604-27e5-4ec7-ab64-44f82285d776'],
  },
  {
    category: 'host',
    field: 'host.containerized',
    values: ['false'],
    originalValue: ['false'],
  },
  {
    category: 'ecs',
    field: 'ecs.version',
    values: ['1.0.0-beta2'],
    originalValue: ['1.0.0-beta2'],
  },
  {
    category: 'agent',
    field: 'agent.version',
    values: ['7.0.0'],
    originalValue: ['7.0.0'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.fileinfo.stored',
    values: ['false'],
    originalValue: ['false'],
  },
  {
    category: 'host',
    field: 'host.os.family',
    values: [''],
    originalValue: [''],
  },
  {
    category: 'base',
    field: 'labels.pipeline',
    values: ['filebeat-7.0.0-suricata-eve-pipeline'],
    originalValue: ['filebeat-7.0.0-suricata-eve-pipeline'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.src_ip',
    values: ['54.239.219.210'],
    originalValue: ['54.239.219.210'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.fileinfo.state',
    values: ['CLOSED'],
    originalValue: ['CLOSED'],
  },
  {
    category: 'destination',
    field: 'destination.port',
    values: ['40684'],
    originalValue: ['40684'],
  },
  {
    category: 'traefik',
    field: 'traefik.access.geoip.region_name',
    values: ['Washington'],
    originalValue: ['Washington'],
  },
  {
    category: 'source',
    field: 'source.as.num',
    values: ['16509'],
    originalValue: ['16509'],
  },
  {
    category: 'event',
    field: 'event.end',
    values: ['2019-02-10T02:39:44.107Z'],
    originalValue: ['2019-02-10T02:39:44.107Z'],
  },
  {
    category: 'source',
    field: 'source.geo.location',
    values: ['{"long":-122.3341,"lat":47.6103}'],
    originalValue: ['[{"coordinates":[-122.3341,47.6103],"type":"Point"}]'],
  },
  {
    category: 'source',
    field: 'source.domain',
    values: ['server-54-239-219-210.jfk51.r.cloudfront.net'],
    originalValue: ['server-54-239-219-210.jfk51.r.cloudfront.net'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.fileinfo.size',
    values: ['48277'],
    originalValue: ['48277'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.app_proto',
    values: ['http'],
    originalValue: ['http'],
  },
  {
    category: 'agent',
    field: 'agent.type',
    values: ['filebeat'],
    originalValue: ['filebeat'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.fileinfo.tx_id',
    values: ['301'],
    originalValue: ['301'],
  },
  {
    category: 'event',
    field: 'event.module',
    values: ['suricata'],
    originalValue: ['suricata'],
  },
  {
    category: 'network',
    field: 'network.protocol',
    values: ['http'],
    originalValue: ['http'],
  },
  {
    category: 'host',
    field: 'host.os.kernel',
    values: ['4.14.50-v7+'],
    originalValue: ['4.14.50-v7+'],
  },
  {
    category: 'source',
    field: 'source.geo.country_iso_code',
    values: ['US'],
    originalValue: ['US'],
  },
  {
    category: '@version',
    field: '@version',
    values: ['1'],
    originalValue: ['1'],
  },
  {
    category: 'host',
    field: 'host.id',
    values: ['b19a781f683541a7a25ee345133aa399'],
    originalValue: ['b19a781f683541a7a25ee345133aa399'],
  },
  {
    category: 'source',
    field: 'source.as.org',
    values: ['Amazon.com, Inc.'],
    originalValue: ['Amazon.com, Inc.'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.timestamp',
    values: ['2019-02-10T02:39:44.107Z'],
    originalValue: ['2019-02-10T02:39:44.107Z'],
  },
  {
    category: 'host',
    field: 'host.os.codename',
    values: ['stretch'],
    originalValue: ['stretch'],
  },
  {
    category: 'source',
    field: 'source.geo.continent_name',
    values: ['North America'],
    originalValue: ['North America'],
  },
  {
    category: 'network',
    field: 'network.name',
    values: ['iot'],
    originalValue: ['iot'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.http.http_method',
    values: ['get'],
    originalValue: ['get'],
  },
  {
    category: 'traefik',
    field: 'traefik.access.geoip.continent_name',
    values: ['North America'],
    originalValue: ['North America'],
  },
  {
    category: 'file',
    field: 'file.size',
    values: ['48277'],
    originalValue: ['48277'],
  },
  {
    category: 'destination',
    field: 'destination.ip',
    values: ['10.100.7.196'],
    originalValue: ['10.100.7.196'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.http.length',
    values: ['48277'],
    originalValue: ['48277'],
  },
  {
    category: 'http',
    field: 'http.response.body.bytes',
    values: ['48277'],
    originalValue: ['48277'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.fileinfo.filename',
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
    originalValue: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.dest_ip',
    values: ['10.100.7.196'],
    originalValue: ['10.100.7.196'],
  },
  {
    category: 'network',
    field: 'network.transport',
    values: ['tcp'],
    originalValue: ['tcp'],
  },
  {
    category: 'url',
    field: 'url.original',
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
    originalValue: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
  },
  {
    category: 'base',
    field: '@timestamp',
    values: ['2019-02-10T02:39:44.107Z'],
    originalValue: ['2019-02-10T02:39:44.107Z'],
  },
  {
    category: 'host',
    field: 'host.os.platform',
    values: ['raspbian'],
    originalValue: ['raspbian'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.dest_port',
    values: ['40684'],
    originalValue: ['40684'],
  },
  {
    category: 'event',
    field: 'event.type',
    values: ['fileinfo'],
    originalValue: ['fileinfo'],
  },
  {
    category: 'log',
    field: 'log.file.path',
    values: ['/var/log/suricata/eve.json'],
    originalValue: ['/var/log/suricata/eve.json'],
  },
  {
    category: 'url',
    field: 'url.domain',
    values: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
    originalValue: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
  },
  {
    category: 'agent',
    field: 'agent.ephemeral_id',
    values: ['909cd6a1-527d-41a5-9585-a7fb5386f851'],
    originalValue: ['909cd6a1-527d-41a5-9585-a7fb5386f851'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.http.http_content_type',
    values: ['video/mp4'],
    originalValue: ['video/mp4'],
  },
  {
    category: 'event',
    field: 'event.dataset',
    values: ['suricata.eve'],
    originalValue: ['suricata.eve'],
  },
  {
    category: '_index',
    field: '_index',
    values: ['filebeat-7.0.0-iot-2019.06'],
    originalValue: ['filebeat-7.0.0-iot-2019.06'],
  },
  {
    category: '_id',
    field: '_id',
    values: ['QRhG1WgBqd-n62SwZYDT'],
    originalValue: ['QRhG1WgBqd-n62SwZYDT'],
  },
  {
    category: '_score',
    field: '_score',
    values: ['1'],
    originalValue: ['1'],
  },
];

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Timeline Details', () => {
    before(() => esArchiver.load('filebeat/default'));
    after(() => esArchiver.unload('filebeat/default'));

    it('Make sure that we get Event Details data', async () => {
      const {
        body: { data: detailsData },
      } = await supertest
        .post('/internal/search/securitySolutionTimelineSearchStrategy/')
        .set('kbn-xsrf', 'true')
        .send({
          factoryQueryType: TimelineEventsQueries.details,
          docValueFields: [],
          indexName: INDEX_NAME,
          inspect: false,
          eventId: ID,
        })
        .expect(200);
      expect(
        sortBy(detailsData, 'name').map((item) => {
          const { __typename, ...rest } = item;
          return rest;
        })
      ).to.eql(sortBy(EXPECTED_DATA, 'name'));
    });
  });
}
