/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { sortBy } from 'lodash';

import { timelineDetailsQuery } from '../../../../plugins/siem/public/containers/timeline/details/index.gql_query';
import { DetailItem, GetTimelineDetailsQuery } from '../../../../plugins/siem/public/graphql/types';
import { KbnTestProvider } from './types';

type DetailsData = Array<
  Pick<
    DetailItem,
    'category' | 'description' | 'example' | 'field' | 'type' | 'values' | 'originalValue'
  > & {
    __typename: string;
  }
>;

// typical values that have to change after an update from "scripts/es_archiver"
const INDEX_NAME = 'filebeat-7.0.0-iot-2019.06';
const ID = 'QRhG1WgBqd-n62SwZYDT';
const EXPECTED_DATA: DetailItem[] = [
  {
    category: '_id',
    description: 'Each document has an _id that uniquely identifies it',
    example: 'Y-6TfmcB0WOhS6qyMv3s',
    field: '_id',
    type: 'keyword',
    originalValue: 'QRhG1WgBqd-n62SwZYDT',
    values: ['QRhG1WgBqd-n62SwZYDT'],
  },
  {
    category: '_index',
    description:
      'An index is like a ‘database’ in a relational database. It has a mapping which defines multiple types. An index is a logical namespace which maps to one or more primary shards and can have zero or more replica shards.',
    example: 'auditbeat-8.0.0-2019.02.19-000001',
    field: '_index',
    type: 'keyword',
    originalValue: 'filebeat-7.0.0-iot-2019.06',
    values: ['filebeat-7.0.0-iot-2019.06'],
  },
  {
    category: '_type',
    description: null,
    example: null,
    field: '_type',
    type: 'keyword',
    originalValue: '_doc',
    values: ['_doc'],
  },
  {
    category: '_score',
    description: null,
    example: null,
    field: '_score',
    type: 'long',
    originalValue: 1,
    values: ['1'],
  },
  {
    category: '@timestamp',
    description:
      'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
    example: '2016-05-23T08:05:34.853Z',
    field: '@timestamp',
    type: 'date',
    originalValue: '2019-02-10T02:39:44.107Z',
    values: ['2019-02-10T02:39:44.107Z'],
  },
  {
    category: '@version',
    description: null,
    example: null,
    field: '@version',
    type: 'keyword',
    originalValue: '1',
    values: ['1'],
  },
  {
    category: 'agent',
    description:
      'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
    example: '8a4f500f',
    field: 'agent.ephemeral_id',
    type: 'keyword',
    originalValue: '909cd6a1-527d-41a5-9585-a7fb5386f851',
    values: ['909cd6a1-527d-41a5-9585-a7fb5386f851'],
  },
  {
    category: 'agent',
    description: null,
    example: null,
    field: 'agent.hostname',
    type: 'keyword',
    originalValue: 'raspberrypi',
    values: ['raspberrypi'],
  },
  {
    category: 'agent',
    description:
      'Unique identifier of this agent (if one exists). Example: For Beats this would be beat.id.',
    example: '8a4f500d',
    field: 'agent.id',
    type: 'keyword',
    originalValue: '4d3ea604-27e5-4ec7-ab64-44f82285d776',
    values: ['4d3ea604-27e5-4ec7-ab64-44f82285d776'],
  },
  {
    category: 'agent',
    description:
      'Type of the agent. The agent type stays always the same and should be given by the agent used. In case of Filebeat the agent would always be Filebeat also if two Filebeat instances are run on the same machine.',
    example: 'filebeat',
    field: 'agent.type',
    type: 'keyword',
    originalValue: 'filebeat',
    values: ['filebeat'],
  },
  {
    category: 'agent',
    description: 'Version of the agent.',
    example: '6.0.0-rc2',
    field: 'agent.version',
    type: 'keyword',
    originalValue: '7.0.0',
    values: ['7.0.0'],
  },
  {
    category: 'destination',
    description: 'Destination domain.',
    example: null,
    field: 'destination.domain',
    type: 'keyword',
    originalValue: 's3-iad-2.cf.dash.row.aiv-cdn.net',
    values: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
  },
  {
    category: 'destination',
    description: 'IP address of the destination. Can be one or multiple IPv4 or IPv6 addresses.',
    example: null,
    field: 'destination.ip',
    type: 'ip',
    originalValue: '10.100.7.196',
    values: ['10.100.7.196'],
  },
  {
    category: 'destination',
    description: 'Port of the destination.',
    example: null,
    field: 'destination.port',
    type: 'long',
    originalValue: 40684,
    values: ['40684'],
  },
  {
    category: 'ecs',
    description:
      'ECS version this event conforms to. `ecs.version` is a required field and must exist in all events. When querying across multiple indices -- which may conform to slightly different ECS versions -- this field lets integrations adjust to the schema version of the events. The current version is 1.0.0-beta2 .',
    example: '1.0.0-beta2',
    field: 'ecs.version',
    type: 'keyword',
    originalValue: '1.0.0-beta2',
    values: ['1.0.0-beta2'],
  },
  {
    category: 'event',
    description:
      'Name of the dataset. The concept of a `dataset` (fileset / metricset) is used in Beats as a subset of modules. It contains the information which is currently stored in metricset.name and metricset.module or fileset.name.',
    example: 'stats',
    field: 'event.dataset',
    type: 'keyword',
    originalValue: 'suricata.eve',
    values: ['suricata.eve'],
  },
  {
    category: 'event',
    description:
      'event.end contains the date when the event ended or when the activity was last observed.',
    example: null,
    field: 'event.end',
    type: 'date',
    originalValue: '2019-02-10T02:39:44.107Z',
    values: ['2019-02-10T02:39:44.107Z'],
  },
  {
    category: 'event',
    description:
      'The kind of the event. This gives information about what type of information the event contains, without being specific to the contents of the event.  Examples are `event`, `state`, `alarm`. Warning: In future versions of ECS, we plan to provide a list of acceptable values for this field, please use with caution.',
    example: 'state',
    field: 'event.kind',
    type: 'keyword',
    originalValue: 'event',
    values: ['event'],
  },
  {
    category: 'event',
    description:
      'Name of the module this data is coming from. This information is coming from the modules used in Beats or Logstash.',
    example: 'mysql',
    field: 'event.module',
    type: 'keyword',
    originalValue: 'suricata',
    values: ['suricata'],
  },
  {
    category: 'event',
    description: 'Reserved for future usage. Please avoid using this field for user data.',
    example: null,
    field: 'event.type',
    type: 'keyword',
    originalValue: 'fileinfo',
    values: ['fileinfo'],
  },
  {
    category: 'file',
    description: 'Path to the file.',
    example: null,
    field: 'file.path',
    type: 'keyword',
    originalValue:
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
  },
  {
    category: 'file',
    description: 'File size in bytes (field is only added when `type` is `file`).',
    example: null,
    field: 'file.size',
    type: 'long',
    originalValue: 48277,
    values: ['48277'],
  },
  {
    category: 'fileset',
    description: null,
    example: null,
    field: 'fileset.name',
    type: 'keyword',
    originalValue: 'eve',
    values: ['eve'],
  },
  {
    category: 'flow',
    description: null,
    example: null,
    field: 'flow.locality',
    type: 'keyword',
    originalValue: 'public',
    values: ['public'],
  },
  {
    category: 'host',
    description: 'Operating system architecture.',
    example: 'x86_64',
    field: 'host.architecture',
    type: 'keyword',
    originalValue: 'armv7l',
    values: ['armv7l'],
  },
  {
    category: 'host',
    description:
      'Hostname of the host. It normally contains what the `hostname` command returns on the host machine.',
    example: null,
    field: 'host.hostname',
    type: 'keyword',
    originalValue: 'raspberrypi',
    values: ['raspberrypi'],
  },
  {
    category: 'host',
    description:
      'Unique host id. As hostname is not always unique, use values that are meaningful in your environment. Example: The current usage of `beat.name`.',
    example: null,
    field: 'host.id',
    type: 'keyword',
    originalValue: 'b19a781f683541a7a25ee345133aa399',
    values: ['b19a781f683541a7a25ee345133aa399'],
  },
  {
    category: 'host',
    description:
      'Name of the host. It can contain what `hostname` returns on Unix systems, the fully qualified domain name, or a name specified by the user. The sender decides which value to use.',
    example: null,
    field: 'host.name',
    type: 'keyword',
    originalValue: 'raspberrypi',
    values: ['raspberrypi'],
  },
  {
    category: 'host',
    description: null,
    example: null,
    field: 'host.os.codename',
    type: 'keyword',
    originalValue: 'stretch',
    values: ['stretch'],
  },
  {
    category: 'host',
    description: 'OS family (such as redhat, debian, freebsd, windows).',
    example: 'debian',
    field: 'host.os.family',
    type: 'keyword',
    originalValue: '',
    values: [''],
  },
  {
    category: 'host',
    description: 'Operating system kernel version as a raw string.',
    example: '4.4.0-112-generic',
    field: 'host.os.kernel',
    type: 'keyword',
    originalValue: '4.14.50-v7+',
    values: ['4.14.50-v7+'],
  },
  {
    category: 'host',
    description: 'Operating system name, without the version.',
    example: 'Mac OS X',
    field: 'host.os.name',
    type: 'keyword',
    originalValue: 'Raspbian GNU/Linux',
    values: ['Raspbian GNU/Linux'],
  },
  {
    category: 'host',
    description: 'Operating system platform (such centos, ubuntu, windows).',
    example: 'darwin',
    field: 'host.os.platform',
    type: 'keyword',
    originalValue: 'raspbian',
    values: ['raspbian'],
  },
  {
    category: 'host',
    description: 'Operating system version as a raw string.',
    example: '10.14.1',
    field: 'host.os.version',
    type: 'keyword',
    originalValue: '9 (stretch)',
    values: ['9 (stretch)'],
  },
  {
    category: 'http',
    description:
      'Http request method. The field value must be normalized to lowercase for querying. See "Lowercase Capitalization" in the "Implementing ECS"  section.',
    example: 'get, post, put',
    field: 'http.request.method',
    type: 'keyword',
    originalValue: 'get',
    values: ['get'],
  },
  {
    category: 'http',
    description: 'Size in bytes of the response body.',
    example: '887',
    field: 'http.response.body.bytes',
    type: 'long',
    originalValue: 48277,
    values: ['48277'],
  },
  {
    category: 'http',
    description: 'Http response status code.',
    example: '404',
    field: 'http.response.status_code',
    type: 'long',
    originalValue: 206,
    values: ['206'],
  },
  {
    category: 'input',
    description: null,
    example: null,
    field: 'input.type',
    type: 'keyword',
    originalValue: 'log',
    values: ['log'],
  },
  {
    category: 'labels',
    description: null,
    example: null,
    field: 'labels.pipeline',
    type: 'keyword',
    originalValue: 'filebeat-7.0.0-suricata-eve-pipeline',
    values: ['filebeat-7.0.0-suricata-eve-pipeline'],
  },
  {
    category: 'log',
    description: null,
    example: null,
    field: 'log.file.path',
    type: 'keyword',
    originalValue: '/var/log/suricata/eve.json',
    values: ['/var/log/suricata/eve.json'],
  },
  {
    category: 'log',
    description: null,
    example: null,
    field: 'log.offset',
    type: 'long',
    originalValue: 1856288115,
    values: ['1856288115'],
  },
  {
    category: 'network',
    description: 'Name given by operators to sections of their network.',
    example: 'Guest Wifi',
    field: 'network.name',
    type: 'keyword',
    originalValue: 'iot',
    values: ['iot'],
  },
  {
    category: 'network',
    description:
      'L7 Network protocol name. ex. http, lumberjack, transport protocol. The field value must be normalized to lowercase for querying. See "Lowercase Capitalization" in the "Implementing ECS" section.',
    example: 'http',
    field: 'network.protocol',
    type: 'keyword',
    originalValue: 'http',
    values: ['http'],
  },
  {
    category: 'network',
    description:
      'Same as network.iana_number, but instead using the Keyword name of the transport layer (udp, tcp, ipv6-icmp, etc.) The field value must be normalized to lowercase for querying. See "Lowercase Capitalization" in the "Implementing ECS"  section.',
    example: 'tcp',
    field: 'network.transport',
    type: 'keyword',
    originalValue: 'tcp',
    values: ['tcp'],
  },
  {
    category: 'service',
    description:
      'The type of the service data is collected from. The type can be used to group and correlate logs and metrics from one service type. Example: If logs or metrics are collected from Elasticsearch, `service.type` would be `elasticsearch`.',
    example: 'elasticsearch',
    field: 'service.type',
    type: 'keyword',
    originalValue: 'suricata',
    values: ['suricata'],
  },
  {
    category: 'source',
    description: null,
    example: null,
    field: 'source.as.num',
    type: 'long',
    originalValue: 16509,
    values: ['16509'],
  },
  {
    category: 'source',
    description: null,
    example: null,
    field: 'source.as.org',
    type: 'keyword',
    originalValue: 'Amazon.com, Inc.',
    values: ['Amazon.com, Inc.'],
  },
  {
    category: 'source',
    description: 'Source domain.',
    example: null,
    field: 'source.domain',
    type: 'keyword',
    originalValue: 'server-54-239-219-210.jfk51.r.cloudfront.net',
    values: ['server-54-239-219-210.jfk51.r.cloudfront.net'],
  },
  {
    category: 'source',
    description: 'City name.',
    example: 'Montreal',
    field: 'source.geo.city_name',
    type: 'keyword',
    originalValue: 'Seattle',
    values: ['Seattle'],
  },
  {
    category: 'source',
    description: 'Name of the continent.',
    example: 'North America',
    field: 'source.geo.continent_name',
    type: 'keyword',
    originalValue: 'North America',
    values: ['North America'],
  },
  {
    category: 'source',
    description: 'Country ISO code.',
    example: 'CA',
    field: 'source.geo.country_iso_code',
    type: 'keyword',
    originalValue: 'US',
    values: ['US'],
  },
  {
    category: 'source',
    description: 'Region ISO code.',
    example: 'CA-QC',
    field: 'source.geo.region_iso_code',
    type: 'keyword',
    originalValue: 'US-WA',
    values: ['US-WA'],
  },
  {
    category: 'source',
    description: 'Region name.',
    example: 'Quebec',
    field: 'source.geo.region_name',
    type: 'keyword',
    originalValue: 'Washington',
    values: ['Washington'],
  },
  {
    category: 'source',
    description: 'IP address of the source. Can be one or multiple IPv4 or IPv6 addresses.',
    example: null,
    field: 'source.ip',
    type: 'ip',
    originalValue: '54.239.219.210',
    values: ['54.239.219.210'],
  },
  {
    category: 'source',
    description: 'Port of the source.',
    example: null,
    field: 'source.port',
    type: 'long',
    originalValue: 80,
    values: ['80'],
  },
  {
    category: 'suricata',
    description: null,
    example: null,
    field: 'suricata.eve.fileinfo.state',
    type: 'keyword',
    originalValue: 'CLOSED',
    values: ['CLOSED'],
  },
  {
    category: 'suricata',
    description: null,
    example: null,
    field: 'suricata.eve.fileinfo.tx_id',
    type: 'long',
    originalValue: 301,
    values: ['301'],
  },
  {
    category: 'suricata',
    description: null,
    example: null,
    field: 'suricata.eve.flow_id',
    type: 'keyword',
    originalValue: 196625917175466,
    values: ['196625917175466'],
  },
  {
    category: 'suricata',
    description: null,
    example: null,
    field: 'suricata.eve.http.http_content_type',
    type: 'keyword',
    originalValue: 'video/mp4',
    values: ['video/mp4'],
  },
  {
    category: 'suricata',
    description: null,
    example: null,
    field: 'suricata.eve.http.protocol',
    type: 'keyword',
    originalValue: 'HTTP/1.1',
    values: ['HTTP/1.1'],
  },
  {
    category: 'suricata',
    description: null,
    example: null,
    field: 'suricata.eve.in_iface',
    type: 'keyword',
    originalValue: 'eth0',
    values: ['eth0'],
  },
  {
    category: 'tags',
    description: 'List of keywords used to tag each event.',
    example: '["production", "env2"]',
    field: 'tags',
    type: 'keyword',
    originalValue: ['suricata'],
    values: ['suricata'],
  },
  {
    category: 'url',
    description:
      'Domain of the request, such as "www.elastic.co". In some cases a URL may refer to an IP and/or port directly, without a domain name. In this case, the IP address would go to the `domain` field.',
    example: 'www.elastic.co',
    field: 'url.domain',
    type: 'keyword',
    originalValue: 's3-iad-2.cf.dash.row.aiv-cdn.net',
    values: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
  },
  {
    category: 'url',
    description:
      'Unmodified original url as seen in the event source. Note that in network monitoring, the observed URL may be a full URL, whereas in access logs, the URL is often just represented as a path. This field is meant to represent the URL as it was observed, complete or not.',
    example: 'https://www.elastic.co:443/search?q=elasticsearch#top or /search?q=elasticsearch',
    field: 'url.original',
    type: 'keyword',
    originalValue:
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    values: [
      '/dm/2$XTMWANo0Q2RZKlH-95UoAahZrOg~/0a9a/bf72/e1da/4c20-919e-0cbabcf7bfe8/75f50c57-d25f-4e97-9e37-01b9f5caa293_audio_13.mp4',
    ],
  },
  {
    category: 'url',
    description: 'Path of the request, such as "/search".',
    example: null,
    field: 'url.path',
    type: 'keyword',
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
