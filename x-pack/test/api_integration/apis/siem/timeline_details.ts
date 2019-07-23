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
import { KbnTestProvider } from './types';

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
    field: '_id',
    originalValue: 'QRhG1WgBqd-n62SwZYDT',
    values: ['QRhG1WgBqd-n62SwZYDT'],
  },
  {
    field: '_index',
    originalValue: 'filebeat-7.0.0-iot-2019.06',
    values: ['filebeat-7.0.0-iot-2019.06'],
  },
  {
    field: '_type',
    originalValue: '_doc',
    values: ['_doc'],
  },
  {
    field: '_score',
    originalValue: 1,
    values: ['1'],
  },
  {
    field: '@timestamp',
    originalValue: '2019-02-10T02:39:44.107Z',
    values: ['2019-02-10T02:39:44.107Z'],
  },
  {
    field: '@version',
    originalValue: '1',
    values: ['1'],
  },
  {
    field: 'agent.ephemeral_id',
    originalValue: '909cd6a1-527d-41a5-9585-a7fb5386f851',
    values: ['909cd6a1-527d-41a5-9585-a7fb5386f851'],
  },
  {
    field: 'agent.hostname',
    originalValue: 'raspberrypi',
    values: ['raspberrypi'],
  },
  {
    field: 'agent.id',
    originalValue: '4d3ea604-27e5-4ec7-ab64-44f82285d776',
    values: ['4d3ea604-27e5-4ec7-ab64-44f82285d776'],
  },
  {
    field: 'agent.type',
    originalValue: 'filebeat',
    values: ['filebeat'],
  },
  {
    field: 'agent.version',
    originalValue: '7.0.0',
    values: ['7.0.0'],
  },
  {
    field: 'destination.domain',
    originalValue: 's3-iad-2.cf.dash.row.aiv-cdn.net',
    values: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
  },
  {
    field: 'destination.ip',
    originalValue: '10.100.7.196',
    values: ['10.100.7.196'],
  },
  {
    field: 'destination.port',
    originalValue: 40684,
    values: ['40684'],
  },
  {
    field: 'ecs.version',
    originalValue: '1.0.0-beta2',
    values: ['1.0.0-beta2'],
  },
  {
    field: 'event.dataset',
    originalValue: 'suricata.eve',
    values: ['suricata.eve'],
  },
  {
    field: 'event.end',
    originalValue: '2019-02-10T02:39:44.107Z',
    values: ['2019-02-10T02:39:44.107Z'],
  },
  {
    field: 'event.kind',
    originalValue: 'event',
    values: ['event'],
  },
  {
    field: 'event.module',
    originalValue: 'suricata',
    values: ['suricata'],
  },
  {
    field: 'event.type',
    originalValue: 'fileinfo',
    values: ['fileinfo'],
  },
  {
    field: 'file.path',
    originalValue:
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
  },
  {
    field: 'file.size',
    originalValue: 48277,
    values: ['48277'],
  },
  {
    field: 'fileset.name',
    originalValue: 'eve',
    values: ['eve'],
  },
  {
    field: 'flow.locality',
    originalValue: 'public',
    values: ['public'],
  },
  {
    field: 'host.architecture',
    originalValue: 'armv7l',
    values: ['armv7l'],
  },
  {
    field: 'host.hostname',
    originalValue: 'raspberrypi',
    values: ['raspberrypi'],
  },
  {
    field: 'host.id',
    originalValue: 'b19a781f683541a7a25ee345133aa399',
    values: ['b19a781f683541a7a25ee345133aa399'],
  },
  {
    field: 'host.name',
    originalValue: 'raspberrypi',
    values: ['raspberrypi'],
  },
  {
    field: 'host.os.codename',
    originalValue: 'stretch',
    values: ['stretch'],
  },
  {
    field: 'host.os.family',
    originalValue: '',
    values: [''],
  },
  {
    field: 'host.os.kernel',
    originalValue: '4.14.50-v7+',
    values: ['4.14.50-v7+'],
  },
  {
    field: 'host.os.name',
    originalValue: 'Raspbian GNU/Linux',
    values: ['Raspbian GNU/Linux'],
  },
  {
    field: 'host.os.platform',
    originalValue: 'raspbian',
    values: ['raspbian'],
  },
  {
    field: 'host.os.version',
    originalValue: '9 (stretch)',
    values: ['9 (stretch)'],
  },
  {
    field: 'http.request.method',
    originalValue: 'get',
    values: ['get'],
  },
  {
    field: 'http.response.body.bytes',
    originalValue: 48277,
    values: ['48277'],
  },
  {
    field: 'http.response.status_code',
    originalValue: 206,
    values: ['206'],
  },
  {
    field: 'input.type',
    originalValue: 'log',
    values: ['log'],
  },
  {
    field: 'labels.pipeline',
    originalValue: 'filebeat-7.0.0-suricata-eve-pipeline',
    values: ['filebeat-7.0.0-suricata-eve-pipeline'],
  },
  {
    field: 'log.file.path',
    originalValue: '/var/log/suricata/eve.json',
    values: ['/var/log/suricata/eve.json'],
  },
  {
    field: 'log.offset',
    originalValue: 1856288115,
    values: ['1856288115'],
  },
  {
    field: 'network.name',
    originalValue: 'iot',
    values: ['iot'],
  },
  {
    field: 'network.protocol',
    originalValue: 'http',
    values: ['http'],
  },
  {
    field: 'network.transport',
    originalValue: 'tcp',
    values: ['tcp'],
  },
  {
    field: 'service.type',
    originalValue: 'suricata',
    values: ['suricata'],
  },
  {
    field: 'source.as.num',
    originalValue: 16509,
    values: ['16509'],
  },
  {
    field: 'source.as.org',
    originalValue: 'Amazon.com, Inc.',
    values: ['Amazon.com, Inc.'],
  },
  {
    field: 'source.domain',
    originalValue: 'server-54-239-219-210.jfk51.r.cloudfront.net',
    values: ['server-54-239-219-210.jfk51.r.cloudfront.net'],
  },
  {
    field: 'source.geo.city_name',
    originalValue: 'Seattle',
    values: ['Seattle'],
  },
  {
    field: 'source.geo.continent_name',
    originalValue: 'North America',
    values: ['North America'],
  },
  {
    field: 'source.geo.country_iso_code',
    originalValue: 'US',
    values: ['US'],
  },
  {
    field: 'source.geo.region_iso_code',
    originalValue: 'US-WA',
    values: ['US-WA'],
  },
  {
    field: 'source.geo.region_name',
    originalValue: 'Washington',
    values: ['Washington'],
  },
  {
    field: 'source.ip',
    originalValue: '54.239.219.210',
    values: ['54.239.219.210'],
  },
  {
    field: 'source.port',
    originalValue: 80,
    values: ['80'],
  },
  {
    field: 'suricata.eve.fileinfo.state',
    originalValue: 'CLOSED',
    values: ['CLOSED'],
  },
  {
    field: 'suricata.eve.fileinfo.tx_id',
    originalValue: 301,
    values: ['301'],
  },
  {
    field: 'suricata.eve.flow_id',
    originalValue: 196625917175466,
    values: ['196625917175466'],
  },
  {
    field: 'suricata.eve.http.http_content_type',
    originalValue: 'video/mp4',
    values: ['video/mp4'],
  },
  {
    field: 'suricata.eve.http.protocol',
    originalValue: 'HTTP/1.1',
    values: ['HTTP/1.1'],
  },
  {
    field: 'suricata.eve.in_iface',
    originalValue: 'eth0',
    values: ['eth0'],
  },
  {
    field: 'tags',
    originalValue: ['suricata'],
    values: ['suricata'],
  },
  {
    field: 'url.domain',
    originalValue: 's3-iad-2.cf.dash.row.aiv-cdn.net',
    values: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
  },
  {
    field: 'url.original',
    originalValue:
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
  },
  {
    field: 'url.path',
    originalValue:
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
  },
];

const timelineDetailsTests: KbnTestProvider = ({ getService }) => {
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
};

// eslint-disable-next-line import/no-default-export
export default timelineDetailsTests;
