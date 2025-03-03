/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  TaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { LogMeta, Logger } from '@kbn/core/server';
import type {
  DataStream,
  DataStreams,
  IlmPolicies,
  IlmsStats,
  IndicesMetadataServiceSetup,
  IndicesMetadataServiceStart,
  IndicesStats,
} from './indices_metadata_service.types';

import { type ITelemetryReceiver, TelemetryReceiver } from './receiver';
import { type ITelemetrySender, TelemetrySender } from './sender';
import {
  TELEMETRY_DATA_STREAM_EVENT,
  TELEMETRY_ILM_POLICY_EVENT,
  TELEMETRY_ILM_STATS_EVENT,
  TELEMETRY_INDEX_STATS_EVENT,
} from './ebt/events';

const TASK_TYPE = 'MetricsDataAccess:IndicesMetadata';
const TASK_ID = 'metrics-data-access:indices-metadata:1.0.0';
const INTERVAL = '1m';

export class IndicesMetadataService {
  private readonly logger: Logger;
  private readonly receiver: ITelemetryReceiver;
  private readonly sender: ITelemetrySender;

  constructor(logger: Logger) {
    this.logger = logger;
    this.receiver = new TelemetryReceiver(this.logger.get('telemetry_events.receiver'));
    this.sender = new TelemetrySender(this.logger.get('telemetry_events.sender'));
  }

  public setup(setup: IndicesMetadataServiceSetup) {
    this.logger.info('Setting up indices metadata service');
    this.registerIndicesMetadataTask(setup.taskManager);
  }

  public async start(start: IndicesMetadataServiceStart) {
    this.logger.info('Starting indices metadata service');

    await Promise.all([
      this.scheduleIndicesMetadataTask(start.taskManager),
      this.receiver.start(start.esClient),
      this.sender.start(start.analytics),
    ]);
  }

  private async publishIndicesMetadata() {
    this.logger.info(`About to publish indices metadata`);

    // 1. Get cluster stats and list of indices and datastreams
    const [indices, dataStreams] = await Promise.all([
      this.receiver.getIndices(),
      this.receiver.getDataStreams(),
    ]);

    // 2. Publish datastreams stats
    const dsCount = this.publishDatastreamsStats(
      dataStreams.slice(0, 1000) // TODO threshold should be configured somewhere
    );

    // 3. Get and publish indices stats
    const indicesCount: number = await this.publishIndicesStats(
      indices.slice(0, 1000) // TODO threshold should be configured somewhere
    )
      .then((count) => {
        return count;
      })
      .catch((err) => {
        this.logger.warn(`Error getting indices stats`, { error: err.message } as LogMeta);
        return 0;
      });

    // 4. Get ILM stats and publish them
    let ilmNames = new Set<string>();

    if (await this.receiver.isIlmStatsAvailable()) {
      ilmNames = await this.publishIlmStats(indices.slice(0, 1000)) // TODO threshold should be configured somewhere
        .then((names) => {
          return names;
        })
        .catch((err) => {
          this.logger.warn(`Error getting ILM stats`, { error: err.message } as LogMeta);
          return new Set<string>();
        });
    } else {
      this.logger.warn(`ILM explain API is not available`);
    }

    // 5. Publish ILM policies
    const policyCount = await this.publishIlmPolicies(ilmNames)
      .then((count) => {
        return count;
      })
      .catch((err) => {
        this.logger.warn(`Error getting ILM policies`, { error: err.message } as LogMeta);
        return 0;
      });

    this.logger.info(`Sent EBT events`, {
      datastreams: dsCount,
      ilms: ilmNames.size,
      indices: indicesCount,
      policies: policyCount,
    } as LogMeta);
  }

  private publishDatastreamsStats(stats: DataStream[]): number {
    const events: DataStreams = {
      items: stats,
    };
    this.sender.reportEBT(TELEMETRY_DATA_STREAM_EVENT, events);
    this.logger.info(`Sent data streams`, { count: events.items.length } as LogMeta);
    return events.items.length;
  }

  private registerIndicesMetadataTask(taskManager: TaskManagerSetupContract) {
    const service = this;

    this.logger.info(`About to register task ${TASK_ID}`);

    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Metrics Data Access - Indices Metadata Task',
        description: 'This task periodically pushes indices metadata to the telemetry service.',
        timeout: '2m',
        maxAttempts: 1,

        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            async run() {
              const { state } = taskInstance;
              service.publishIndicesMetadata();
              return { state };
            },

            async cancel() {
              service.logger?.warn(`Task ${TASK_ID} timed out`);
            },
          };
        },
      },
    });
  }

  private async scheduleIndicesMetadataTask(
    taskManager: TaskManagerStartContract
  ): Promise<TaskInstance | null> {
    this.logger.info(`About to schedule task ${TASK_ID}`);

    try {
      const taskInstance = await taskManager.ensureScheduled({
        id: TASK_ID,
        taskType: TASK_TYPE,
        schedule: {
          interval: INTERVAL,
        },
        params: {},
        state: {},
        scope: ['uptime'],
      });

      this.logger?.info(
        `Task ${TASK_ID} scheduled with interval ${taskInstance.schedule?.interval}.`
      );

      return taskInstance;
    } catch (e) {
      this.logger.error(e);
      this.logger.error(`Error running synthetics syncs task: ${TASK_ID}, ${e?.message}`);

      return null;
    }
  }

  private async publishIndicesStats(indices: string[]): Promise<number> {
    const indicesStats: IndicesStats = {
      items: [],
    };

    for await (const stat of this.receiver.getIndicesStats(indices)) {
      indicesStats.items.push(stat);
    }
    this.sender.reportEBT(TELEMETRY_INDEX_STATS_EVENT, indicesStats);
    this.logger.info(`Sent indices stats`, { count: indicesStats.items.length } as LogMeta);
    return indicesStats.items.length;
  }

  private async publishIlmStats(indices: string[]): Promise<Set<string>> {
    const ilmNames = new Set<string>();
    const ilmsStats: IlmsStats = {
      items: [],
    };

    for await (const stat of this.receiver.getIlmsStats(indices)) {
      if (stat.policy_name !== undefined) {
        ilmNames.add(stat.policy_name);
        ilmsStats.items.push(stat);
      }
    }

    this.sender.reportEBT(TELEMETRY_ILM_STATS_EVENT, ilmsStats);
    this.logger.info(`Sent ILM stats`, { count: ilmNames.size } as LogMeta);

    return ilmNames;
  }

  async publishIlmPolicies(ilmNames: Set<string>): Promise<number> {
    const ilmPolicies: IlmPolicies = {
      items: [],
    };

    for await (const policy of this.receiver.getIlmsPolicies(Array.from(ilmNames.values()))) {
      ilmPolicies.items.push(policy);
    }
    this.sender.reportEBT(TELEMETRY_ILM_POLICY_EVENT, ilmPolicies);
    this.logger.info('Sent ILM policies', { count: ilmPolicies.items.length } as LogMeta);
    return ilmPolicies.items.length;
  }
}
