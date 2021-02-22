/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    category: 'base',
    field: '@timestamp',
    isObjectArray: false,
    values: ['2019-02-10T02:39:44.107Z'],
    originalValue: ['2019-02-10T02:39:44.107Z'],
  },
  {
    category: '@version',
    field: '@version',
    isObjectArray: false,
    values: ['1'],
    originalValue: ['1'],
  },
  {
    category: 'agent',
    field: 'agent.ephemeral_id',
    isObjectArray: false,
    values: ['909cd6a1-527d-41a5-9585-a7fb5386f851'],
    originalValue: ['909cd6a1-527d-41a5-9585-a7fb5386f851'],
  },
  {
    category: 'agent',
    field: 'agent.hostname',
    isObjectArray: false,
    values: ['raspberrypi'],
    originalValue: ['raspberrypi'],
  },
  {
    category: 'agent',
    field: 'agent.id',
    isObjectArray: false,
    values: ['4d3ea604-27e5-4ec7-ab64-44f82285d776'],
    originalValue: ['4d3ea604-27e5-4ec7-ab64-44f82285d776'],
  },
  {
    category: 'agent',
    field: 'agent.type',
    isObjectArray: false,
    values: ['filebeat'],
    originalValue: ['filebeat'],
  },
  {
    category: 'agent',
    field: 'agent.version',
    isObjectArray: false,
    values: ['7.0.0'],
    originalValue: ['7.0.0'],
  },
  {
    category: 'destination',
    field: 'destination.domain',
    isObjectArray: false,
    values: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
    originalValue: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
  },
  {
    category: 'destination',
    field: 'destination.ip',
    isObjectArray: false,
    values: ['10.100.7.196'],
    originalValue: ['10.100.7.196'],
  },
  {
    category: 'destination',
    field: 'destination.port',
    isObjectArray: false,
    values: ['40684'],
    originalValue: ['40684'],
  },
  {
    category: 'ecs',
    field: 'ecs.version',
    isObjectArray: false,
    values: ['1.0.0-beta2'],
    originalValue: ['1.0.0-beta2'],
  },
  {
    category: 'event',
    field: 'event.dataset',
    isObjectArray: false,
    values: ['suricata.eve'],
    originalValue: ['suricata.eve'],
  },
  {
    category: 'event',
    field: 'event.end',
    isObjectArray: false,
    values: ['2019-02-10T02:39:44.107Z'],
    originalValue: ['2019-02-10T02:39:44.107Z'],
  },
  {
    category: 'event',
    field: 'event.kind',
    isObjectArray: false,
    values: ['event'],
    originalValue: ['event'],
  },
  {
    category: 'event',
    field: 'event.module',
    isObjectArray: false,
    values: ['suricata'],
    originalValue: ['suricata'],
  },
  {
    category: 'event',
    field: 'event.type',
    isObjectArray: false,
    values: ['fileinfo'],
    originalValue: ['fileinfo'],
  },
  {
    category: 'file',
    field: 'file.path',
    isObjectArray: false,
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
    originalValue: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
  },
  {
    category: 'file',
    field: 'file.size',
    isObjectArray: false,
    values: ['48277'],
    originalValue: ['48277'],
  },
  {
    category: 'fileset',
    field: 'fileset.name',
    isObjectArray: false,
    values: ['eve'],
    originalValue: ['eve'],
  },
  {
    category: 'flow',
    field: 'flow.locality',
    isObjectArray: false,
    values: ['public'],
    originalValue: ['public'],
  },
  {
    category: 'host',
    field: 'host.architecture',
    isObjectArray: false,
    values: ['armv7l'],
    originalValue: ['armv7l'],
  },
  {
    category: 'host',
    field: 'host.hostname',
    isObjectArray: false,
    values: ['raspberrypi'],
    originalValue: ['raspberrypi'],
  },
  {
    category: 'host',
    field: 'host.id',
    isObjectArray: false,
    values: ['b19a781f683541a7a25ee345133aa399'],
    originalValue: ['b19a781f683541a7a25ee345133aa399'],
  },
  {
    category: 'host',
    field: 'host.name',
    isObjectArray: false,
    values: ['raspberrypi'],
    originalValue: ['raspberrypi'],
  },
  {
    category: 'host',
    field: 'host.os.codename',
    isObjectArray: false,
    values: ['stretch'],
    originalValue: ['stretch'],
  },
  {
    category: 'host',
    field: 'host.os.family',
    isObjectArray: false,
    values: [''],
    originalValue: [''],
  },
  {
    category: 'host',
    field: 'host.os.kernel',
    isObjectArray: false,
    values: ['4.14.50-v7+'],
    originalValue: ['4.14.50-v7+'],
  },
  {
    category: 'host',
    field: 'host.os.name',
    isObjectArray: false,
    values: ['Raspbian GNU/Linux'],
    originalValue: ['Raspbian GNU/Linux'],
  },
  {
    category: 'host',
    field: 'host.os.platform',
    isObjectArray: false,
    values: ['raspbian'],
    originalValue: ['raspbian'],
  },
  {
    category: 'host',
    field: 'host.os.version',
    isObjectArray: false,
    values: ['9 (stretch)'],
    originalValue: ['9 (stretch)'],
  },
  {
    category: 'http',
    field: 'http.request.method',
    isObjectArray: false,
    values: ['get'],
    originalValue: ['get'],
  },
  {
    category: 'http',
    field: 'http.response.body.bytes',
    isObjectArray: false,
    values: ['48277'],
    originalValue: ['48277'],
  },
  {
    category: 'http',
    field: 'http.response.status_code',
    isObjectArray: false,
    values: ['206'],
    originalValue: ['206'],
  },
  {
    category: 'input',
    field: 'input.type',
    isObjectArray: false,
    values: ['log'],
    originalValue: ['log'],
  },
  {
    category: 'base',
    field: 'labels.pipeline',
    isObjectArray: false,
    values: ['filebeat-7.0.0-suricata-eve-pipeline'],
    originalValue: ['filebeat-7.0.0-suricata-eve-pipeline'],
  },
  {
    category: 'log',
    field: 'log.file.path',
    isObjectArray: false,
    values: ['/var/log/suricata/eve.json'],
    originalValue: ['/var/log/suricata/eve.json'],
  },
  {
    category: 'log',
    field: 'log.offset',
    isObjectArray: false,
    values: ['1856288115'],
    originalValue: ['1856288115'],
  },
  {
    category: 'network',
    field: 'network.name',
    isObjectArray: false,
    values: ['iot'],
    originalValue: ['iot'],
  },
  {
    category: 'network',
    field: 'network.protocol',
    isObjectArray: false,
    values: ['http'],
    originalValue: ['http'],
  },
  {
    category: 'network',
    field: 'network.transport',
    isObjectArray: false,
    values: ['tcp'],
    originalValue: ['tcp'],
  },
  {
    category: 'service',
    field: 'service.type',
    isObjectArray: false,
    values: ['suricata'],
    originalValue: ['suricata'],
  },
  {
    category: 'source',
    field: 'source.as.num',
    isObjectArray: false,
    values: ['16509'],
    originalValue: ['16509'],
  },
  {
    category: 'source',
    field: 'source.as.org',
    isObjectArray: false,
    values: ['Amazon.com, Inc.'],
    originalValue: ['Amazon.com, Inc.'],
  },
  {
    category: 'source',
    field: 'source.domain',
    isObjectArray: false,
    values: ['server-54-239-219-210.jfk51.r.cloudfront.net'],
    originalValue: ['server-54-239-219-210.jfk51.r.cloudfront.net'],
  },
  {
    category: 'source',
    field: 'source.geo.city_name',
    isObjectArray: false,
    values: ['Seattle'],
    originalValue: ['Seattle'],
  },
  {
    category: 'source',
    field: 'source.geo.continent_name',
    isObjectArray: false,
    values: ['North America'],
    originalValue: ['North America'],
  },
  {
    category: 'source',
    field: 'source.geo.country_iso_code',
    isObjectArray: false,
    values: ['US'],
    originalValue: ['US'],
  },
  {
    category: 'source',
    field: 'source.geo.location.lat',
    isObjectArray: false,
    values: ['47.6103'],
    originalValue: ['47.6103'],
  },
  {
    category: 'source',
    field: 'source.geo.location.lon',
    isObjectArray: false,
    values: ['-122.3341'],
    originalValue: ['-122.3341'],
  },
  {
    category: 'source',
    field: 'source.geo.region_iso_code',
    isObjectArray: false,
    values: ['US-WA'],
    originalValue: ['US-WA'],
  },
  {
    category: 'source',
    field: 'source.geo.region_name',
    isObjectArray: false,
    values: ['Washington'],
    originalValue: ['Washington'],
  },
  {
    category: 'source',
    field: 'source.ip',
    isObjectArray: false,
    values: ['54.239.219.210'],
    originalValue: ['54.239.219.210'],
  },
  {
    category: 'source',
    field: 'source.port',
    isObjectArray: false,
    values: ['80'],
    originalValue: ['80'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.fileinfo.state',
    isObjectArray: false,
    values: ['CLOSED'],
    originalValue: ['CLOSED'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.fileinfo.tx_id',
    isObjectArray: false,
    values: ['301'],
    originalValue: ['301'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.flow_id',
    isObjectArray: false,
    values: ['196625917175466'],
    originalValue: ['196625917175466'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.http.http_content_type',
    isObjectArray: false,
    values: ['video/mp4'],
    originalValue: ['video/mp4'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.http.protocol',
    isObjectArray: false,
    values: ['HTTP/1.1'],
    originalValue: ['HTTP/1.1'],
  },
  {
    category: 'suricata',
    field: 'suricata.eve.in_iface',
    isObjectArray: false,
    values: ['eth0'],
    originalValue: ['eth0'],
  },
  {
    category: 'base',
    field: 'tags',
    isObjectArray: false,
    values: ['suricata'],
    originalValue: ['suricata'],
  },
  {
    category: 'url',
    field: 'url.domain',
    isObjectArray: false,
    values: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
    originalValue: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
  },
  {
    category: 'url',
    field: 'url.original',
    isObjectArray: false,
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
    isObjectArray: false,
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
    originalValue: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
  },
  {
    category: '_index',
    field: '_index',
    isObjectArray: false,
    values: ['filebeat-7.0.0-iot-2019.06'],
    originalValue: ['filebeat-7.0.0-iot-2019.06'],
  },
  {
    category: '_id',
    field: '_id',
    isObjectArray: false,
    values: ['QRhG1WgBqd-n62SwZYDT'],
    originalValue: ['QRhG1WgBqd-n62SwZYDT'],
  },
  {
    category: '_score',
    field: '_score',
    isObjectArray: false,
    values: ['1'],
    originalValue: ['1'],
  },
];

const EXPECTED_KPI_COUNTS = {
  destinationIpCount: 154,
  hostCount: 1,
  processCount: 0,
  sourceIpCount: 121,
  userCount: 0,
};

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
      expect(sortBy(detailsData, 'name')).to.eql(sortBy(EXPECTED_DATA, 'name'));
    });

    it('Make sure that we get kpi data', async () => {
      const {
        body: { destinationIpCount, hostCount, processCount, sourceIpCount, userCount },
      } = await supertest
        .post('/internal/search/securitySolutionTimelineSearchStrategy/')
        .set('kbn-xsrf', 'true')
        .send({
          factoryQueryType: TimelineEventsQueries.kpi,
          docValueFields: [],
          indexName: INDEX_NAME,
          inspect: false,
          eventId: ID,
        })
        .expect(200);
      expect({ destinationIpCount, hostCount, processCount, sourceIpCount, userCount }).to.eql(
        EXPECTED_KPI_COUNTS
      );
    });
  });
}
