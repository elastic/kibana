/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { FLEET_ENDPOINT_PACKAGE } from '@kbn/fleet-plugin/common';
import type { ITelemetryEventsSender } from '../sender';
import {
  TelemetryChannel,
  TelemetryCounter,
  type EndpointMetadataDocument,
  type EndpointMetricDocument,
  type EndpointPolicyResponseDocument,
  type ESClusterInfo,
  type ESLicense,
  type Nullable,
} from '../types';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import type { ITaskMetricsService } from '../task_metrics.types';
import {
  addDefaultAdvancedPolicyConfigSettings,
  batchTelemetryRecords,
  createUsageCounterLabel,
  extractEndpointPolicyConfig,
  getPreviousDailyTaskTimestamp,
  isPackagePolicyList,
  newTelemetryLogger,
  safeValue,
} from '../helpers';
import type { TelemetryLogger } from '../telemetry_logger';
import type { PolicyData } from '../../../../common/endpoint/types';
import { telemetryConfiguration } from '../configuration';
import { TELEMETRY_CHANNEL_ENDPOINT_META } from '../constants';

/**
 * Endpoint agent uses this Policy ID while it's installing.
 */
const DefaultEndpointPolicyIdToIgnore = '00000000-0000-0000-0000-000000000000';

const usageLabelPrefix: string[] = ['security_telemetry', 'endpoint_task'];

export function createTelemetryEndpointTaskConfig(maxTelemetryBatch: number) {
  const taskType = 'security:endpoint-meta-telemetry';
  return {
    type: taskType,
    title: 'Security Solution Telemetry Endpoint Metrics and Info task',
    interval: '24h',
    timeout: '5m',
    version: '1.0.0',
    getLastExecutionTime: getPreviousDailyTaskTimestamp,
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const mdc = { task_id: taskId, task_execution_period: taskExecutionPeriod };
      const log = newTelemetryLogger(logger.get('endpoint'), mdc);
      const trace = taskMetricsService.start(taskType);

      log.l('Running telemetry task');

      try {
        const processor = new EndpointMetadataProcessor(log, receiver);

        const documents = await processor.process(taskExecutionPeriod);

        const telemetryUsageCounter = sender.getTelemetryUsageCluster();
        telemetryUsageCounter?.incrementCounter({
          counterName: createUsageCounterLabel(
            usageLabelPrefix.concat(['payloads', TelemetryChannel.ENDPOINT_META])
          ),
          counterType: TelemetryCounter.NUM_ENDPOINT,
          incrementBy: documents.length,
        });

        log.l('Sending endpoint telemetry', {
          num_docs: documents.length,
          async_sender: telemetryConfiguration.use_async_sender,
        });

        // STAGE 6 - Send the documents
        if (telemetryConfiguration.use_async_sender) {
          sender.sendAsync(TelemetryChannel.ENDPOINT_META, documents);
        } else {
          const batches = batchTelemetryRecords(documents, maxTelemetryBatch);
          for (const batch of batches) {
            await sender.sendOnDemand(TELEMETRY_CHANNEL_ENDPOINT_META, batch);
          }
        }
        await taskMetricsService.end(trace);

        return documents.length;
      } catch (err) {
        log.l(`Error running endpoint alert telemetry task`, {
          error: JSON.stringify(err),
        });
        await taskMetricsService.end(trace, err);
        return 0;
      }
    },
  };
}

class EndpointMetadataProcessor {
  private readonly logger: TelemetryLogger;

  constructor(logger: Logger, private readonly receiver: ITelemetryReceiver) {
    this.logger = newTelemetryLogger(logger.get('processor'));
  }

  public async process(taskExecutionPeriod: TaskExecutionPeriod): Promise<object[]> {
    const last = taskExecutionPeriod.last;
    const current = taskExecutionPeriod.current;

    if (!last) {
      throw new Error('last execution timestamp is required');
    }

    // STAGE 1 - Fetch Endpoint Agent Metrics
    const endpointMetrics = await this.receiver.fetchEndpointMetricsAbstract(last, current);
    //  If no metrics exist, early (and successfull) exit
    if (endpointMetrics.totalEndpoints === 0) {
      this.logger.l('no endpoint metrics to report');
      return [];
    }

    /**
     * STAGE 2
     *  - Fetch Fleet Agent Config
     *  - Ignore policy used while installing the endpoint agent.
     *  - Fetch Endpoint Policy Configs
     */
    const policyIdByFleetAgentId = await this.receiver
      .fetchFleetAgents()
      .then((policies) => {
        policies.delete(DefaultEndpointPolicyIdToIgnore);
        return policies;
      })
      .catch((e) => {
        this.logger.l('Error fetching fleet agents, using an empty value', {
          error: JSON.stringify(e),
        });
        return new Map();
      });
    const endpointPolicyById = await this.endpointPolicies(policyIdByFleetAgentId.values());

    /**
     * STAGE 3 - Fetch Endpoint Policy Responses
     */
    const policyResponses = await this.receiver
      .fetchEndpointPolicyResponses(last, current)
      .then((response) => {
        if (response.size === 0) {
          this.logger.l('no endpoint policy responses to report');
        }
        return response;
      })
      .catch((e) => {
        this.logger.l('Error fetching policy responses, using an empty value', {
          error: JSON.stringify(e),
        });
        return new Map();
      });

    /**
     * STAGE 4 - Fetch Endpoint Agent Metadata
     */
    const endpointMetadata = await this.receiver
      .fetchEndpointMetadata(last, current)
      .then((response) => {
        if (response.size === 0) {
          this.logger.l('no endpoint metadata to report');
        }
        return response;
      })
      .catch((e) => {
        this.logger.l('Error fetching endpoint metadata, using an empty value', {
          error: JSON.stringify(e),
        });
        return new Map();
      });

    /** STAGE 5 - Create the telemetry log records
     *
     * Iterates through the endpoint metrics documents at STAGE 1 and joins them together
     * to form the telemetry log that is sent back to Elastic Security developers to
     * make improvements to the product.
     */
    const clusterData = await this.fetchClusterData();
    const mappingContext = {
      policyIdByFleetAgentId,
      endpointPolicyById,
      policyResponses,
      endpointMetadata,
      taskExecutionPeriod,
      clusterData,
    };
    const telemetryPayloads: object[] = [];
    try {
      for await (const metrics of this.receiver.fetchEndpointMetricsById(
        endpointMetrics.endpointMetricIds
      )) {
        const payloads = metrics.map((endpointMetric) =>
          this.mapEndpointMetric(endpointMetric, mappingContext)
        );
        telemetryPayloads.push(...payloads);
      }
    } catch (e) {
      // something happened in the middle of the pagination, log the error
      // and return what we collect so far instead of aborting the
      // whole execution
      this.logger.l('Error fetching endpoint metrics by id', {
        error: JSON.stringify(e),
      });
    }

    return telemetryPayloads;
  }

  private async fetchClusterData(): Promise<{
    clusterInfo: ESClusterInfo;
    licenseInfo: Nullable<ESLicense>;
  }> {
    const [clusterInfoPromise, licenseInfoPromise] = await Promise.allSettled([
      this.receiver.fetchClusterInfo(),
      this.receiver.fetchLicenseInfo(),
    ]);

    const clusterInfo = safeValue(clusterInfoPromise);
    const licenseInfo = safeValue(licenseInfoPromise);

    return { clusterInfo, licenseInfo };
  }

  private async endpointPolicies(policies: IterableIterator<string>) {
    const endpointPolicyCache = new Map<string, PolicyData>();
    for (const policyId of policies) {
      if (!endpointPolicyCache.has(policyId)) {
        const agentPolicy = await this.receiver.fetchPolicyConfigs(policyId).catch((e) => {
          this.logger.l(`error fetching policy config due to ${e?.message}`);
          return null;
        });

        const packagePolicies = agentPolicy?.package_policies;

        if (packagePolicies !== undefined && isPackagePolicyList(packagePolicies)) {
          packagePolicies
            .map((pPolicy) => pPolicy as PolicyData)
            .forEach((pPolicy) => {
              if (pPolicy.inputs[0]?.config !== undefined && pPolicy.inputs[0]?.config !== null) {
                pPolicy.inputs.forEach((input) => {
                  if (
                    input.type === FLEET_ENDPOINT_PACKAGE &&
                    input?.config !== undefined &&
                    policyId !== undefined
                  ) {
                    endpointPolicyCache.set(policyId, pPolicy);
                  }
                });
              }
            });
        }
      }
    }
    return endpointPolicyCache;
  }

  private mapEndpointMetric(
    endpointMetric: EndpointMetricDocument,
    ctx: {
      policyIdByFleetAgentId: Map<string, string>;
      endpointPolicyById: Map<string, PolicyData>;
      policyResponses: Map<string, EndpointPolicyResponseDocument>;
      endpointMetadata: Map<string, EndpointMetadataDocument>;
      taskExecutionPeriod: TaskExecutionPeriod;
      clusterData: { clusterInfo: ESClusterInfo; licenseInfo: Nullable<ESLicense> };
    }
  ) {
    let policyConfig = null;
    let failedPolicy: Nullable<EndpointPolicyResponseDocument> = null;
    let endpointMetadataById = null;

    const fleetAgentId = endpointMetric.elastic.agent.id;
    const endpointAgentId = endpointMetric.agent.id;

    const policyId = ctx.policyIdByFleetAgentId.get(fleetAgentId);
    if (policyId) {
      policyConfig = ctx.endpointPolicyById.get(policyId) || null;

      if (policyConfig) {
        failedPolicy = ctx.policyResponses.get(endpointAgentId);
      }
    }

    if (ctx.endpointMetadata) {
      endpointMetadataById = ctx.endpointMetadata.get(endpointAgentId);
    }

    const {
      cpu,
      memory,
      uptime,
      documents_volume: documentsVolume,
      malicious_behavior_rules: maliciousBehaviorRules,
      system_impact: systemImpact,
      threads,
      event_filter: eventFilter,
      top_process_trees: topProcessTrees,
    } = endpointMetric.Endpoint.metrics;
    const endpointPolicyDetail = extractEndpointPolicyConfig(policyConfig);
    if (endpointPolicyDetail) {
      endpointPolicyDetail.value = addDefaultAdvancedPolicyConfigSettings(
        endpointPolicyDetail.value
      );
    }
    return {
      '@timestamp': ctx.taskExecutionPeriod.current,
      cluster_uuid: ctx.clusterData.clusterInfo.cluster_uuid,
      cluster_name: ctx.clusterData.clusterInfo.cluster_name,
      license_id: ctx.clusterData.licenseInfo?.uid,
      endpoint_id: endpointAgentId,
      endpoint_version: endpointMetric.agent.version,
      endpoint_package_version: policyConfig?.package?.version || null,
      endpoint_metrics: {
        cpu: cpu.endpoint,
        memory: memory.endpoint.private,
        uptime,
        documentsVolume,
        maliciousBehaviorRules,
        systemImpact,
        threads,
        eventFilter,
        topProcessTrees,
      },
      endpoint_meta: {
        os: endpointMetric.host.os,
        capabilities:
          endpointMetadataById !== null && endpointMetadataById !== undefined
            ? endpointMetadataById.Endpoint.capabilities
            : [],
      },
      policy_config: endpointPolicyDetail !== null ? endpointPolicyDetail : {},
      policy_response:
        failedPolicy !== null && failedPolicy !== undefined
          ? {
              agent_policy_status: failedPolicy.event.agent_id_status,
              manifest_version: failedPolicy.Endpoint.policy.applied.artifacts.global.version,
              status: failedPolicy.Endpoint.policy.applied.status,
              actions: failedPolicy.Endpoint.policy.applied.actions
                .map((action) => (action.status !== 'success' ? action : null))
                .filter((action) => action !== null),
              configuration: failedPolicy.Endpoint.configuration,
              state: failedPolicy.Endpoint.state,
            }
          : {},
      telemetry_meta: {
        metrics_timestamp: endpointMetric['@timestamp'],
      },
    };
  }
}
