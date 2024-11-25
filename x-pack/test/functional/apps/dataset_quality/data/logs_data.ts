/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateLongId, generateShortId, log, timerange } from '@kbn/apm-synthtrace-client';
import moment from 'moment';

enum LogLevel {
  INFO = 'info',
  DEBUG = 'debug',
  ERROR = 'error',
}
interface MessageWithLevel {
  message: string;
  level: LogLevel;
}
interface Cluster {
  clusterId: string;
  clusterName: string;
}

export function getLogsForDataset({
  dataset,
  to,
  count = 1,
  isMalformed = false,
  namespace = defaultNamespace,
  services,
}: {
  dataset: string;
  to: moment.MomentInput;
  count?: number;
  isMalformed?: boolean;
  namespace?: string;
  services?: string[];
}) {
  return timerange(moment(to).subtract(count, 'minute'), moment(to))
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return Array(count)
        .fill(0)
        .flatMap((_, index) => [
          createLogRecord(
            timestamp,
            dataset,
            MESSAGE_LOG_LEVELS[index % MESSAGE_LOG_LEVELS.length],
            services?.[index] ??
              services?.[index % services.length] ??
              SERVICE_NAMES[index % SERVICE_NAMES.length],
            CLUSTER[index % CLUSTER.length],
            CLOUD_PROVIDERS[index % CLOUD_PROVIDERS.length],
            CLOUD_REGION[index % CLOUD_REGION.length],
            isMalformed,
            namespace
          ),
        ]);
    });
}

export function getInitialTestLogs({ to, count = 1 }: { to: string; count?: number }) {
  return timerange(moment(to).subtract(count, 'minute'), moment(to))
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return Array(count)
        .fill(0)
        .flatMap((_, index) => [
          createLogRecord(
            timestamp,
            datasetNames[0],
            MESSAGE_LOG_LEVELS[0],
            SERVICE_NAMES[0],
            CLUSTER[0],
            CLOUD_PROVIDERS[0],
            CLOUD_REGION[0],
            false
          ),
          createLogRecord(
            timestamp,
            datasetNames[1],
            MESSAGE_LOG_LEVELS[1],
            SERVICE_NAMES[1],
            CLUSTER[1],
            CLOUD_PROVIDERS[1],
            CLOUD_REGION[1],
            false
          ),
          createLogRecord(
            timestamp,
            datasetNames[2],
            MESSAGE_LOG_LEVELS[2],
            SERVICE_NAMES[2],
            CLUSTER[2],
            CLOUD_PROVIDERS[2],
            CLOUD_REGION[2],
            false
          ),
        ]);
    });
}

export function createLogRecord(
  timestamp: number,
  dataset: string,
  msg: MessageWithLevel,
  serviceName: string,
  cluster: Cluster,
  cloudProvider: string,
  cloudRegion: string,
  isMalformed = false,
  namespace: string = defaultNamespace
): ReturnType<typeof log.create> {
  return log
    .create()
    .dataset(dataset)
    .message(msg.message)
    .logLevel(msg.level)
    .service(serviceName)
    .namespace(namespace)
    .defaults({
      'trace.id': generateShortId(),
      'agent.name': 'synth-agent',
      'orchestrator.cluster.name': cluster.clusterName,
      'orchestrator.cluster.id': cluster.clusterId,
      'orchestrator.resource.id': generateShortId(),
      'cloud.provider': cloudProvider,
      'cloud.region': cloudRegion,
      'cloud.availability_zone': isMalformed
        ? MORE_THAN_1024_CHARS // "ignore_above": 1024 in mapping
        : `${cloudRegion}a`,
      'cloud.project.id': generateShortId(),
      'cloud.instance.id': generateShortId(),
      'log.file.path': `/logs/${generateLongId()}/error.txt`,
    })
    .timestamp(timestamp);
}

/*
The helped function generates 2 sets of Malformed Docs for the given dataset.
1 set has more Malformed fields than the second one. This help in having different counts and hence sorting
 */
export function createDegradedFieldsRecord({
  to,
  count = 1,
  dataset,
}: {
  to: string;
  count?: number;
  dataset: string;
}) {
  return timerange(moment(to).subtract(count, 'minute'), moment(to))
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return Array(count)
        .fill(0)
        .flatMap((_, index) => [
          log
            .create()
            .dataset(dataset)
            .message(MESSAGE_LOG_LEVELS[0].message)
            .logLevel(MESSAGE_LOG_LEVELS[0].level)
            .service(SERVICE_NAMES[0])
            .namespace(defaultNamespace)
            .defaults({
              'trace.id': generateShortId(),
              'agent.name': 'synth-agent',
              test_field: [MORE_THAN_1024_CHARS, ANOTHER_1024_CHARS],
            })
            .timestamp(timestamp),
          log
            .create()
            .dataset(dataset)
            .message(MESSAGE_LOG_LEVELS[1].message)
            .logLevel(MESSAGE_LOG_LEVELS[1].level)
            .service(SERVICE_NAMES[0])
            .namespace(defaultNamespace)
            .defaults({
              'trace.id': generateShortId(),
              'agent.name': 'synth-agent',
              'cloud.availability_zone': MORE_THAN_1024_CHARS,
            })
            .timestamp(timestamp),
        ]);
    });
}

/*
The helper function generates Failed Docs for the given dataset.
 */
export function createFailedRecords({
  to,
  count = 1,
  dataset,
  namespace,
  rate = 1, // rate of failed logs (min value 0, max value 1)
}: {
  to: string;
  count?: number;
  dataset: string;
  namespace?: string;
  rate?: number;
}) {
  return timerange(moment(to).subtract(count, 'minute'), moment(to))
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return Array(count)
        .fill(0)
        .flatMap((_, index) => {
          const isFailed = index % (count * rate) === 0;
          return log
            .create()
            .dataset(dataset)
            .message(MESSAGE_LOG_LEVELS[0].message)
            .logLevel(isFailed ? 'anyLevel' : LogLevel.INFO)
            .service(SERVICE_NAMES[0])
            .namespace(namespace ?? defaultNamespace)
            .defaults({
              'trace.id': generateShortId(),
              'agent.name': 'synth-agent',
            })
            .timestamp(timestamp);
        });
    });
}

export const customLogLevelProcessor = [
  {
    script: {
      tag: 'normalize log level',
      lang: 'painless',
      source: `
        String level = ctx['log.level'];
        if ('info'.equals(level)) {
          ctx['log.level'] = 'info';
        } else if ('debug'.equals(level)) {
          ctx['log.level'] = 'debug';
        } else if ('error'.equals(level)) {
          ctx['log.level'] = 'error';
        } else {
          throw new Exception("Not a valid log level");
        }
      `,
    },
  },
];

export const datasetNames = ['synth.1', 'synth.2', 'synth.3', 'synth.failed'];
export const defaultNamespace = 'default';
export const productionNamespace = 'production';

// Logs Data logic
const MESSAGE_LOG_LEVELS: MessageWithLevel[] = [
  { message: 'A simple log', level: LogLevel.INFO },
  {
    message: 'Another log message',
    level: LogLevel.DEBUG,
  },
  { message: 'Error with certificate: "ca_trusted_fingerprint"', level: LogLevel.ERROR },
];
const CLOUD_PROVIDERS = ['gcp', 'aws', 'azure'];
const CLOUD_REGION = ['eu-central-1', 'us-east-1', 'area-51'];

const CLUSTER = [
  { clusterId: generateShortId(), clusterName: 'synth-cluster-1' },
  { clusterId: generateShortId(), clusterName: 'synth-cluster-2' },
  { clusterId: generateShortId(), clusterName: 'synth-cluster-3' },
];

const SERVICE_NAMES = [`synth-service-0`, `synth-service-1`, `synth-service-2`];

export const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';
export const ANOTHER_1024_CHARS =
  'grape fig tangerine tangerine kiwi lemon papaya cherry nectarine papaya mango cherry nectarine fig cherry fig grape mango mango quince fig strawberry mango quince date kiwi quince raspberry apple kiwi banana quince fig papaya grape mango cherry banana mango cherry lemon cherry tangerine fig quince quince papaya tangerine grape strawberry banana kiwi grape mango papaya nectarine banana nectarine kiwi papaya lemon apple lemon orange fig cherry grape apple nectarine papaya orange fig papaya date mango papaya mango cherry tangerine papaya apple banana papaya cherry strawberry grape raspberry lemon date papaya mango kiwi cherry fig banana banana apple date strawberry mango tangerine date lemon kiwi quince date orange orange papaya date apple fig tangerine quince tangerine date papaya banana banana orange raspberry papaya apple nectarine lemon raspberry raspberry mango cherry kiwi cherry cherry nectarine cherry date strawberry banana orange mango mango tangerine quince papaya papaya kiwi papaya strawberry date mango';
