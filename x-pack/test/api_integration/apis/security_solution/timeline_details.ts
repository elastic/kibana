/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import {
  TimelineEventsQueries,
  TimelineEventsDetailsStrategyResponse,
  TimelineKpiStrategyResponse,
} from '../../../../plugins/security_solution/common/search_strategy';

import { FtrProviderContext } from '../../ftr_provider_context';

// typical values that have to change after an update from "scripts/es_archiver"
const INDEX_NAME = 'filebeat-7.0.0-iot-2019.06';
const ID = 'QRhG1WgBqd-n62SwZYDT';
const EXPECTED_DATA = [
  {
    category: 'base',
    field: '@timestamp',
    values: ['2019-02-10T02:39:44.107Z'],
    originalValue: ['2019-02-10T02:39:44.107Z'],
    isObjectArray: false,
  },
  {
    category: '@version',
    field: '@version',
    values: ['1'],
    originalValue: ['1'],
    isObjectArray: false,
  },
  {
    category: '_id',
    field: '_id',
    values: ['QRhG1WgBqd-n62SwZYDT'],
    originalValue: ['QRhG1WgBqd-n62SwZYDT'],
    isObjectArray: false,
  },
  {
    category: '_index',
    field: '_index',
    values: ['filebeat-7.0.0-iot-2019.06'],
    originalValue: ['filebeat-7.0.0-iot-2019.06'],
    isObjectArray: false,
  },
  {
    category: '_score',
    field: '_score',
    values: ['1'],
    originalValue: ['1'],
    isObjectArray: false,
  },
  {
    category: 'agent',
    field: 'agent.ephemeral_id',
    values: ['909cd6a1-527d-41a5-9585-a7fb5386f851'],
    originalValue: ['909cd6a1-527d-41a5-9585-a7fb5386f851'],
    isObjectArray: false,
  },
  {
    category: 'agent',
    field: 'agent.hostname',
    values: ['raspberrypi'],
    originalValue: ['raspberrypi'],
    isObjectArray: false,
  },
  {
    category: 'agent',
    field: 'agent.id',
    values: ['4d3ea604-27e5-4ec7-ab64-44f82285d776'],
    originalValue: ['4d3ea604-27e5-4ec7-ab64-44f82285d776'],
    isObjectArray: false,
  },
  {
    category: 'agent',
    field: 'agent.type',
    values: ['filebeat'],
    originalValue: ['filebeat'],
    isObjectArray: false,
  },
  {
    category: 'agent',
    field: 'agent.version',
    values: ['7.0.0'],
    originalValue: ['7.0.0'],
    isObjectArray: false,
  },
  {
    category: 'destination',
    field: 'destination.domain',
    values: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
    originalValue: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
    isObjectArray: false,
  },
  {
    category: 'destination',
    field: 'destination.ip',
    values: ['10.100.7.196'],
    originalValue: ['10.100.7.196'],
    isObjectArray: false,
  },
  {
    category: 'destination',
    field: 'destination.port',
    values: ['40684'],
    originalValue: ['40684'],
    isObjectArray: false,
  },
  {
    category: 'ecs',
    field: 'ecs.version',
    values: ['1.0.0-beta2'],
    originalValue: ['1.0.0-beta2'],
    isObjectArray: false,
  },
  {
    category: 'event',
    field: 'event.dataset',
    values: ['suricata.eve'],
    originalValue: ['suricata.eve'],
    isObjectArray: false,
  },
  {
    category: 'event',
    field: 'event.end',
    values: ['2019-02-10T02:39:44.107Z'],
    originalValue: ['2019-02-10T02:39:44.107Z'],
    isObjectArray: false,
  },
  {
    category: 'event',
    field: 'event.kind',
    values: ['event'],
    originalValue: ['event'],
    isObjectArray: false,
  },
  {
    category: 'event',
    field: 'event.module',
    values: ['suricata'],
    originalValue: ['suricata'],
    isObjectArray: false,
  },
  {
    category: 'event',
    field: 'event.type',
    values: ['fileinfo'],
    originalValue: ['fileinfo'],
    isObjectArray: false,
  },
  {
    category: 'file',
    field: 'file.path',
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
    originalValue: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
    isObjectArray: false,
  },
  {
    category: 'file',
    field: 'file.size',
    values: ['48277'],
    originalValue: ['48277'],
    isObjectArray: false,
  },
  {
    category: 'fileset',
    field: 'fileset.name',
    values: ['eve'],
    originalValue: ['eve'],
    isObjectArray: false,
  },
  {
    category: 'flow',
    field: 'flow.locality',
    values: ['public'],
    originalValue: ['public'],
    isObjectArray: false,
  },
  {
    category: 'host',
    field: 'host.architecture',
    values: ['armv7l'],
    originalValue: ['armv7l'],
    isObjectArray: false,
  },
  {
    category: 'host',
    field: 'host.containerized',
    values: ['false'],
    originalValue: ['false'],
    isObjectArray: false,
  },
  {
    category: 'host',
    field: 'host.hostname',
    values: ['raspberrypi'],
    originalValue: ['raspberrypi'],
    isObjectArray: false,
  },
  {
    category: 'host',
    field: 'host.id',
    values: ['b19a781f683541a7a25ee345133aa399'],
    originalValue: ['b19a781f683541a7a25ee345133aa399'],
    isObjectArray: false,
  },
  {
    category: 'host',
    field: 'host.name',
    values: ['raspberrypi'],
    originalValue: ['raspberrypi'],
    isObjectArray: false,
  },
  {
    category: 'host',
    field: 'host.os.codename',
    values: ['stretch'],
    originalValue: ['stretch'],
    isObjectArray: false,
  },
  {
    category: 'host',
    field: 'host.os.family',
    values: [''],
    originalValue: [''],
    isObjectArray: false,
  },
  {
    category: 'host',
    field: 'host.os.kernel',
    values: ['4.14.50-v7+'],
    originalValue: ['4.14.50-v7+'],
    isObjectArray: false,
  },
  {
    category: 'host',
    field: 'host.os.name',
    values: ['Raspbian GNU/Linux'],
    originalValue: ['Raspbian GNU/Linux'],
    isObjectArray: false,
  },
  {
    category: 'host',
    field: 'host.os.platform',
    values: ['raspbian'],
    originalValue: ['raspbian'],
    isObjectArray: false,
  },
  {
    category: 'host',
    field: 'host.os.version',
    values: ['9 (stretch)'],
    originalValue: ['9 (stretch)'],
    isObjectArray: false,
  },
  {
    category: 'http',
    field: 'http.request.method',
    values: ['get'],
    originalValue: ['get'],
    isObjectArray: false,
  },
  {
    category: 'http',
    field: 'http.response.body.bytes',
    values: ['48277'],
    originalValue: ['48277'],
    isObjectArray: false,
  },
  {
    category: 'http',
    field: 'http.response.status_code',
    values: ['206'],
    originalValue: ['206'],
    isObjectArray: false,
  },
  {
    category: 'input',
    field: 'input.type',
    values: ['log'],
    originalValue: ['log'],
    isObjectArray: false,
  },
  {
    category: 'base',
    field: 'labels.pipeline',
    values: ['filebeat-7.0.0-suricata-eve-pipeline'],
    originalValue: ['filebeat-7.0.0-suricata-eve-pipeline'],
    isObjectArray: false,
  },
  {
    category: 'log',
    field: 'log.file.path',
    values: ['/var/log/suricata/eve.json'],
    originalValue: ['/var/log/suricata/eve.json'],
    isObjectArray: false,
  },
  {
    category: 'log',
    field: 'log.offset',
    values: ['1856288115'],
    originalValue: ['1856288115'],
    isObjectArray: false,
  },
  {
    category: 'network',
    field: 'network.name',
    values: ['iot'],
    originalValue: ['iot'],
    isObjectArray: false,
  },
  {
    category: 'network',
    field: 'network.protocol',
    values: ['http'],
    originalValue: ['http'],
    isObjectArray: false,
  },
  {
    category: 'network',
    field: 'network.transport',
    values: ['tcp'],
    originalValue: ['tcp'],
    isObjectArray: false,
  },
  {
    category: 'service',
    field: 'service.type',
    values: ['suricata'],
    originalValue: ['suricata'],
    isObjectArray: false,
  },
  {
    category: 'source',
    field: 'source.as.num',
    values: ['16509'],
    originalValue: ['16509'],
    isObjectArray: false,
  },
  {
    category: 'source',
    field: 'source.as.org',
    values: ['Amazon.com, Inc.'],
    originalValue: ['Amazon.com, Inc.'],
    isObjectArray: false,
  },
  {
    category: 'source',
    field: 'source.domain',
    values: ['server-54-239-219-210.jfk51.r.cloudfront.net'],
    originalValue: ['server-54-239-219-210.jfk51.r.cloudfront.net'],
    isObjectArray: false,
  },
  {
    category: 'source',
    field: 'source.geo.city_name',
    values: ['Seattle'],
    originalValue: ['Seattle'],
    isObjectArray: false,
  },
  {
    category: 'source',
    field: 'source.geo.continent_name',
    values: ['North America'],
    originalValue: ['North America'],
    isObjectArray: false,
  },
  {
    category: 'source',
    field: 'source.geo.country_iso_code',
    values: ['US'],
    originalValue: ['US'],
    isObjectArray: false,
  },
  {
    category: 'source',
    field: 'source.geo.location',
    values: ['{"lon":-122.3341,"lat":47.6103}'],
    originalValue: ['{"lon":-122.3341,"lat":47.6103}'],
    isObjectArray: true,
  },
  {
    category: 'source',
    field: 'source.geo.location.lat',
    values: ['47.6103'],
    originalValue: ['47.6103'],
    isObjectArray: false,
  },
  {
    category: 'source',
    field: 'source.geo.location.lon',
    values: ['-122.3341'],
    originalValue: ['-122.3341'],
    isObjectArray: false,
  },
  {
    category: 'source',
    field: 'source.geo.region_iso_code',
    values: ['US-WA'],
    originalValue: ['US-WA'],
    isObjectArray: false,
  },
  {
    category: 'source',
    field: 'source.geo.region_name',
    values: ['Washington'],
    originalValue: ['Washington'],
    isObjectArray: false,
  },
  {
    category: 'source',
    field: 'source.ip',
    values: ['54.239.219.210'],
    originalValue: ['54.239.219.210'],
    isObjectArray: false,
  },
  {
    category: 'source',
    field: 'source.port',
    values: ['80'],
    originalValue: ['80'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.app_proto',
    values: ['http'],
    originalValue: ['http'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.dest_ip',
    values: ['10.100.7.196'],
    originalValue: ['10.100.7.196'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.dest_port',
    values: ['40684'],
    originalValue: ['40684'],
    isObjectArray: false,
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
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.fileinfo.size',
    values: ['48277'],
    originalValue: ['48277'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.fileinfo.state',
    values: ['CLOSED'],
    originalValue: ['CLOSED'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.fileinfo.stored',
    values: ['false'],
    originalValue: ['false'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.fileinfo.tx_id',
    values: ['301'],
    originalValue: ['301'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.flow_id',
    values: ['196625917175466'],
    originalValue: ['196625917175466'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.http.hostname',
    values: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
    originalValue: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.http.http_content_type',
    values: ['video/mp4'],
    originalValue: ['video/mp4'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.http.http_method',
    values: ['get'],
    originalValue: ['get'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.http.length',
    values: ['48277'],
    originalValue: ['48277'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.http.protocol',
    values: ['HTTP/1.1'],
    originalValue: ['HTTP/1.1'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.http.status',
    values: ['206'],
    originalValue: ['206'],
    isObjectArray: false,
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
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.in_iface',
    values: ['eth0'],
    originalValue: ['eth0'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.proto',
    values: ['tcp'],
    originalValue: ['tcp'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.src_ip',
    values: ['54.239.219.210'],
    originalValue: ['54.239.219.210'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.src_port',
    values: ['80'],
    originalValue: ['80'],
    isObjectArray: false,
  },
  {
    category: 'suricata',
    field: 'suricata.eve.timestamp',
    values: ['2019-02-10T02:39:44.107Z'],
    originalValue: ['2019-02-10T02:39:44.107Z'],
    isObjectArray: false,
  },
  {
    category: 'base',
    field: 'tags',
    values: ['suricata'],
    originalValue: ['suricata'],
    isObjectArray: false,
  },
  {
    category: 'traefik',
    field: 'traefik.access.geoip.city_name',
    values: ['Seattle'],
    originalValue: ['Seattle'],
    isObjectArray: false,
  },
  {
    category: 'traefik',
    field: 'traefik.access.geoip.continent_name',
    values: ['North America'],
    originalValue: ['North America'],
    isObjectArray: false,
  },
  {
    category: 'traefik',
    field: 'traefik.access.geoip.country_iso_code',
    values: ['US'],
    originalValue: ['US'],
    isObjectArray: false,
  },
  {
    category: 'traefik',
    field: 'traefik.access.geoip.location',
    values: ['{"lon":-122.3341,"lat":47.6103}'],
    originalValue: ['{"lon":-122.3341,"lat":47.6103}'],
    isObjectArray: true,
  },
  {
    category: 'traefik',
    field: 'traefik.access.geoip.region_iso_code',
    values: ['US-WA'],
    originalValue: ['US-WA'],
    isObjectArray: false,
  },
  {
    category: 'traefik',
    field: 'traefik.access.geoip.region_name',
    values: ['Washington'],
    originalValue: ['Washington'],
    isObjectArray: false,
  },
  {
    category: 'url',
    field: 'url.domain',
    values: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
    originalValue: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
    isObjectArray: false,
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
    isObjectArray: false,
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
    isObjectArray: false,
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
  const bsearch = getService('bsearch');

  describe('Timeline Details', () => {
    before(
      async () => await esArchiver.load('x-pack/test/functional/es_archives/filebeat/default')
    );
    after(
      async () => await esArchiver.unload('x-pack/test/functional/es_archives/filebeat/default')
    );

    it('Make sure that we get Event Details data', async () => {
      const { data: detailsData } = await bsearch.send<TimelineEventsDetailsStrategyResponse>({
        supertest,
        options: {
          factoryQueryType: TimelineEventsQueries.details,
          docValueFields: [],
          indexName: INDEX_NAME,
          inspect: false,
          eventId: ID,
        },
        strategy: 'timelineSearchStrategy',
      });
      expect(sortBy(detailsData, 'field')).to.eql(sortBy(EXPECTED_DATA, 'field'));
    });

    it('Make sure that we get kpi data', async () => {
      const { destinationIpCount, hostCount, processCount, sourceIpCount, userCount } =
        await bsearch.send<TimelineKpiStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: TimelineEventsQueries.kpi,
            docValueFields: [],
            indexName: INDEX_NAME,
            inspect: false,
            eventId: ID,
          },
          strategy: 'timelineSearchStrategy',
        });
      expect({ destinationIpCount, hostCount, processCount, sourceIpCount, userCount }).to.eql(
        EXPECTED_KPI_COUNTS
      );
    });
  });
}
