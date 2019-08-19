/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { sortBy } from 'lodash';

import { timelineDetailsQuery } from '../../../../legacy/plugins/siem/public/containers/timeline/details/index.gql_query';
import {
  DetailItem,
  GetTimelineDetailsQuery,
} from '../../../../legacy/plugins/siem/public/graphql/types';
import { FtrProviderContext } from '../../ftr_provider_context';

type DetailsData = Array<
  Pick<DetailItem, 'field' | 'values' | 'originalValue'> & {
    __typename: string;
  }
>;

// typical values that have to change after an update from "scripts/es_archiver"
const INDEX_NAME = 'filebeat-7.0.0-iot-2019.06';
const ID = 'QRhG1WgBqd-n62SwZYDT';
const EXPECTED_DATA: DetailItem[] = [
  {
    field: '@timestamp',
    values: ['2019-02-10T02:39:44.107Z'],
    originalValue: '2019-02-10T02:39:44.107Z',
  },
  { field: '@version', values: ['1'], originalValue: '1' },
  {
    field: 'agent.ephemeral_id',
    values: ['909cd6a1-527d-41a5-9585-a7fb5386f851'],
    originalValue: '909cd6a1-527d-41a5-9585-a7fb5386f851',
  },
  {
    field: 'agent.hostname',
    values: ['raspberrypi'],
    originalValue: 'raspberrypi',
  },
  {
    field: 'agent.id',
    values: ['4d3ea604-27e5-4ec7-ab64-44f82285d776'],
    originalValue: '4d3ea604-27e5-4ec7-ab64-44f82285d776',
  },
  {
    field: 'agent.type',
    values: ['filebeat'],
    originalValue: 'filebeat',
  },
  { field: 'agent.version', values: ['7.0.0'], originalValue: '7.0.0' },
  {
    field: 'destination.domain',
    values: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
    originalValue: 's3-iad-2.cf.dash.row.aiv-cdn.net',
  },
  {
    field: 'destination.ip',
    values: ['10.100.7.196'],
    originalValue: '10.100.7.196',
  },
  { field: 'destination.port', values: ['40684'], originalValue: 40684 },
  {
    field: 'ecs.version',
    values: ['1.0.0-beta2'],
    originalValue: '1.0.0-beta2',
  },
  {
    field: 'event.dataset',
    values: ['suricata.eve'],
    originalValue: 'suricata.eve',
  },
  {
    field: 'event.end',
    values: ['2019-02-10T02:39:44.107Z'],
    originalValue: '2019-02-10T02:39:44.107Z',
  },
  { field: 'event.kind', values: ['event'], originalValue: 'event' },
  {
    field: 'event.module',
    values: ['suricata'],
    originalValue: 'suricata',
  },
  {
    field: 'event.type',
    values: ['fileinfo'],
    originalValue: 'fileinfo',
  },
  {
    field: 'file.path',
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
    originalValue:
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
  },
  { field: 'file.size', values: ['48277'], originalValue: 48277 },
  { field: 'fileset.name', values: ['eve'], originalValue: 'eve' },
  { field: 'flow.locality', values: ['public'], originalValue: 'public' },
  {
    field: 'host.architecture',
    values: ['armv7l'],
    originalValue: 'armv7l',
  },
  {
    field: 'host.hostname',
    values: ['raspberrypi'],
    originalValue: 'raspberrypi',
  },
  {
    field: 'host.id',
    values: ['b19a781f683541a7a25ee345133aa399'],
    originalValue: 'b19a781f683541a7a25ee345133aa399',
  },
  {
    field: 'host.name',
    values: ['raspberrypi'],
    originalValue: 'raspberrypi',
  },
  {
    field: 'host.os.codename',
    values: ['stretch'],
    originalValue: 'stretch',
  },
  { field: 'host.os.family', values: [''], originalValue: '' },
  {
    field: 'host.os.kernel',
    values: ['4.14.50-v7+'],
    originalValue: '4.14.50-v7+',
  },
  {
    field: 'host.os.name',
    values: ['Raspbian GNU/Linux'],
    originalValue: 'Raspbian GNU/Linux',
  },
  {
    field: 'host.os.platform',
    values: ['raspbian'],
    originalValue: 'raspbian',
  },
  {
    field: 'host.os.version',
    values: ['9 (stretch)'],
    originalValue: '9 (stretch)',
  },
  { field: 'http.request.method', values: ['get'], originalValue: 'get' },
  {
    field: 'http.response.body.bytes',
    values: ['48277'],
    originalValue: 48277,
  },
  {
    field: 'http.response.status_code',
    values: ['206'],
    originalValue: 206,
  },
  { field: 'input.type', values: ['log'], originalValue: 'log' },
  {
    field: 'labels.pipeline',
    values: ['filebeat-7.0.0-suricata-eve-pipeline'],
    originalValue: 'filebeat-7.0.0-suricata-eve-pipeline',
  },
  {
    field: 'log.file.path',
    values: ['/var/log/suricata/eve.json'],
    originalValue: '/var/log/suricata/eve.json',
  },
  {
    field: 'log.offset',
    values: ['1856288115'],
    originalValue: 1856288115,
  },
  { field: 'network.name', values: ['iot'], originalValue: 'iot' },
  { field: 'network.protocol', values: ['http'], originalValue: 'http' },
  { field: 'network.transport', values: ['tcp'], originalValue: 'tcp' },
  {
    field: 'service.type',
    values: ['suricata'],
    originalValue: 'suricata',
  },
  { field: 'source.as.num', values: ['16509'], originalValue: 16509 },
  {
    field: 'source.as.org',
    values: ['Amazon.com, Inc.'],
    originalValue: 'Amazon.com, Inc.',
  },
  {
    field: 'source.domain',
    values: ['server-54-239-219-210.jfk51.r.cloudfront.net'],
    originalValue: 'server-54-239-219-210.jfk51.r.cloudfront.net',
  },
  {
    field: 'source.geo.city_name',
    values: ['Seattle'],
    originalValue: 'Seattle',
  },
  {
    field: 'source.geo.continent_name',
    values: ['North America'],
    originalValue: 'North America',
  },
  {
    field: 'source.geo.country_iso_code',
    values: ['US'],
    originalValue: 'US',
  },
  {
    field: 'source.geo.location.lat',
    values: ['47.6103'],
    originalValue: 47.6103,
  },
  {
    field: 'source.geo.location.lon',
    values: ['-122.3341'],
    originalValue: -122.3341,
  },
  {
    field: 'source.geo.region_iso_code',
    values: ['US-WA'],
    originalValue: 'US-WA',
  },
  {
    field: 'source.geo.region_name',
    values: ['Washington'],
    originalValue: 'Washington',
  },
  {
    field: 'source.ip',
    values: ['54.239.219.210'],
    originalValue: '54.239.219.210',
  },
  { field: 'source.port', values: ['80'], originalValue: 80 },
  {
    field: 'suricata.eve.fileinfo.state',
    values: ['CLOSED'],
    originalValue: 'CLOSED',
  },
  {
    field: 'suricata.eve.fileinfo.tx_id',
    values: ['301'],
    originalValue: 301,
  },
  {
    field: 'suricata.eve.flow_id',
    values: ['196625917175466'],
    originalValue: 196625917175466,
  },
  {
    field: 'suricata.eve.http.http_content_type',
    values: ['video/mp4'],
    originalValue: 'video/mp4',
  },
  {
    field: 'suricata.eve.http.protocol',
    values: ['HTTP/1.1'],
    originalValue: 'HTTP/1.1',
  },
  {
    field: 'suricata.eve.in_iface',
    values: ['eth0'],
    originalValue: 'eth0',
  },
  { field: 'tags', values: ['suricata'], originalValue: ['suricata'] },
  {
    field: 'url.domain',
    values: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
    originalValue: 's3-iad-2.cf.dash.row.aiv-cdn.net',
  },
  {
    field: 'url.original',
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
    originalValue:
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
  },
  {
    field: 'url.path',
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
    originalValue:
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
  },
  {
    field: '_index',
    values: ['filebeat-7.0.0-iot-2019.06'],
    originalValue: 'filebeat-7.0.0-iot-2019.06',
  },
  { field: '_type', values: ['_doc'], originalValue: '_doc' },
  {
    field: '_id',
    values: ['QRhG1WgBqd-n62SwZYDT'],
    originalValue: 'QRhG1WgBqd-n62SwZYDT',
  },
  { field: '_score', values: ['1'], originalValue: 1 },
];

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');

  describe('Timeline Details', () => {
    before(() => esArchiver.load('filebeat/default'));
    after(() => esArchiver.unload('filebeat/default'));

    it('Make sure that we get Event Details data', () => {
      return client
        .query<GetTimelineDetailsQuery.Query>({
          query: timelineDetailsQuery,
          variables: {
            sourceId: 'default',
            indexName: INDEX_NAME,
            eventId: ID,
            defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          },
        })
        .then(resp => {
          const detailsData: DetailsData = (resp.data.source.TimelineDetails.data ||
            []) as DetailsData;
          expect(
            sortBy(detailsData, 'name').map(item => {
              const { __typename, ...rest } = item;
              return rest;
            })
          ).to.eql(sortBy(EXPECTED_DATA, 'name'));
        });
    });
  });
}
