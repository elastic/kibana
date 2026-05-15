/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsService } from './aws_services_data';
import {
  getAwsIntegrationMatrixRow,
  getAwsMatrixDeliveryMethodsForService,
  getUnionInputRequirementsForSelection,
  selectionSupportsDeliveryMethod,
  type AwsIntegrationInputId,
  type AwsIntegrationInputRequirements,
  type AwsMatrixDeliveryMethod,
} from './aws_integration_matrix';

/** Wizard deployment lanes derived from the V1 integration matrix. */
export type AwsDeploymentLaneId = 'agentless' | 's3_logs' | 'httpjson' | 'agent_based';

export interface AwsDeploymentLane {
  readonly id: AwsDeploymentLaneId;
  readonly serviceIds: readonly string[];
  /** Matrix method used to resolve required inputs for this lane. */
  readonly matrixDeliveryMethod: AwsMatrixDeliveryMethod | 'agent_based';
  readonly inputRequirements: AwsIntegrationInputRequirements;
  /** When true, user picks Cloud Forwarder vs Firehose inside the S3 logs lane. */
  readonly supportsCloudForwarder: boolean;
  readonly supportsFirehose: boolean;
}

export interface AwsDeploymentPlan {
  readonly lanes: readonly AwsDeploymentLane[];
  readonly unmappedServiceIds: readonly string[];
}

export const EMPTY_AWS_DEPLOYMENT_PLAN: AwsDeploymentPlan = {
  lanes: [],
  unmappedServiceIds: [],
};

export type AwsDeploymentConfigValues = Partial<Record<AwsIntegrationInputId, string>>;

const S3_LOGS_METHODS: readonly AwsMatrixDeliveryMethod[] = ['cloud_forwarder', 'firehose'];

function matrixMethodsForService(serviceId: string): readonly AwsMatrixDeliveryMethod[] {
  return getAwsMatrixDeliveryMethodsForService(serviceId).map((config) => config.method);
}

function isHttpJsonOnlyService(serviceId: string): boolean {
  const methods = matrixMethodsForService(serviceId);
  return methods.length === 1 && methods[0] === 'httpjson';
}

function supportsAgentlessAssignment(serviceId: string): boolean {
  if (
    !selectionSupportsDeliveryMethod({
      serviceIds: new Set([serviceId]),
      deliveryMethod: 'agentless',
    })
  ) {
    return false;
  }
  const methods = matrixMethodsForService(serviceId);
  const hasS3Only =
    methods.some((m) => S3_LOGS_METHODS.includes(m)) &&
    !methods.includes('agentless') &&
    !methods.includes('httpjson');
  return !hasS3Only;
}

function isS3LogsLaneService(serviceId: string): boolean {
  const methods = matrixMethodsForService(serviceId);
  const hasS3 = methods.some((m) => S3_LOGS_METHODS.includes(m));
  if (!hasS3) {
    return false;
  }
  return !supportsAgentlessAssignment(serviceId);
}

function laneInputRequirements(
  laneId: AwsDeploymentLaneId,
  serviceIds: readonly string[],
  s3LogsMatrixMethod: AwsMatrixDeliveryMethod
): AwsIntegrationInputRequirements {
  if (laneId === 'agent_based' || serviceIds.length === 0) {
    return { required: [], requireOneOf: [] };
  }
  if (laneId === 's3_logs') {
    return getUnionInputRequirementsForSelection({
      serviceIds: new Set(serviceIds),
      deliveryMethod: s3LogsMatrixMethod,
    });
  }
  return getUnionInputRequirementsForSelection({
    serviceIds: new Set(serviceIds),
    deliveryMethod: laneId,
  });
}

function buildLane(
  id: AwsDeploymentLaneId,
  serviceIds: readonly string[],
  s3LogsMatrixMethod: AwsMatrixDeliveryMethod = 'cloud_forwarder'
): AwsDeploymentLane | undefined {
  if (serviceIds.length === 0) {
    return undefined;
  }
  const supportsCloudForwarder = serviceIds.some((serviceId) =>
    selectionSupportsDeliveryMethod({
      serviceIds: new Set([serviceId]),
      deliveryMethod: 'cloud_forwarder',
    })
  );
  const supportsFirehose = serviceIds.some((serviceId) =>
    selectionSupportsDeliveryMethod({
      serviceIds: new Set([serviceId]),
      deliveryMethod: 'firehose',
    })
  );
  const matrixDeliveryMethod: AwsMatrixDeliveryMethod | 'agent_based' =
    id === 's3_logs' ? s3LogsMatrixMethod : id === 'agent_based' ? 'agent_based' : id;

  return {
    id,
    serviceIds,
    matrixDeliveryMethod,
    inputRequirements: laneInputRequirements(id, serviceIds, s3LogsMatrixMethod),
    supportsCloudForwarder,
    supportsFirehose,
  };
}

/**
 * Partition selected services into the smallest set of matrix-aligned deployment lanes.
 * Services with both agentless and S3/Firehose paths (e.g. CloudTrail, EMR logs) are assigned
 * to agentless by default; S3-only log sources (e.g. ELB logs) use the S3 logs lane.
 */
export function buildAwsDeploymentPlan(serviceIds: ReadonlySet<string>): AwsDeploymentPlan {
  const agentlessIds: string[] = [];
  const s3LogsIds: string[] = [];
  const httpjsonIds: string[] = [];
  const unmappedServiceIds: string[] = [];

  for (const serviceId of serviceIds) {
    const row = getAwsIntegrationMatrixRow(serviceId);
    if (!row) {
      unmappedServiceIds.push(serviceId);
      continue;
    }
    if (isHttpJsonOnlyService(serviceId)) {
      httpjsonIds.push(serviceId);
      continue;
    }
    if (isS3LogsLaneService(serviceId)) {
      s3LogsIds.push(serviceId);
      continue;
    }
    if (supportsAgentlessAssignment(serviceId)) {
      agentlessIds.push(serviceId);
      continue;
    }
    if (
      selectionSupportsDeliveryMethod({
        serviceIds: new Set([serviceId]),
        deliveryMethod: 'cloud_forwarder',
      }) ||
      selectionSupportsDeliveryMethod({
        serviceIds: new Set([serviceId]),
        deliveryMethod: 'firehose',
      })
    ) {
      s3LogsIds.push(serviceId);
      continue;
    }
    unmappedServiceIds.push(serviceId);
  }

  const lanes: AwsDeploymentLane[] = [];
  const agentlessLane = buildLane('agentless', agentlessIds);
  const httpjsonLane = buildLane('httpjson', httpjsonIds);
  const s3LogsLane = buildLane('s3_logs', s3LogsIds);
  const agentBasedLane = buildLane('agent_based', unmappedServiceIds);

  if (agentlessLane) {
    lanes.push(agentlessLane);
  }
  if (s3LogsLane) {
    lanes.push(s3LogsLane);
  }
  if (httpjsonLane) {
    lanes.push(httpjsonLane);
  }
  if (agentBasedLane) {
    lanes.push(agentBasedLane);
  }

  return { lanes, unmappedServiceIds };
}

export function resolveS3LogsDeliveryMethod(params: {
  readonly choice: 'cloud_forwarder' | 'firehose';
  readonly lane: AwsDeploymentLane;
}): AwsMatrixDeliveryMethod {
  const { choice, lane } = params;
  if (choice === 'firehose' && lane.supportsFirehose) {
    return 'firehose';
  }
  if (lane.supportsCloudForwarder) {
    return 'cloud_forwarder';
  }
  return 'firehose';
}

export function isAwsDeploymentInputValueValid(
  inputId: AwsIntegrationInputId,
  value: string | undefined
): boolean {
  return Boolean(value?.trim());
}

export function isLaneConfigComplete(params: {
  readonly lane: AwsDeploymentLane;
  readonly config: AwsDeploymentConfigValues;
  readonly s3LogsDeliveryChoice: 'cloud_forwarder' | 'firehose';
}): boolean {
  const { lane, config, s3LogsDeliveryChoice } = params;
  const matrixMethod =
    lane.id === 's3_logs'
      ? resolveS3LogsDeliveryMethod({ choice: s3LogsDeliveryChoice, lane })
      : lane.matrixDeliveryMethod;

  if (matrixMethod === 'agent_based') {
    return true;
  }

  const { required, requireOneOf } = getUnionInputRequirementsForSelection({
    serviceIds: new Set(lane.serviceIds),
    deliveryMethod: matrixMethod,
  });

  if (!required.every((inputId) => isAwsDeploymentInputValueValid(inputId, config[inputId]))) {
    return false;
  }

  return requireOneOf.every((group) =>
    group.some((inputId) => isAwsDeploymentInputValueValid(inputId, config[inputId]))
  );
}

export function serviceNamesForLane(
  lane: AwsDeploymentLane,
  catalog: readonly AwsService[]
): string[] {
  const byId = new Map(catalog.map((service) => [service.id, service.name]));
  return lane.serviceIds.map((id) => byId.get(id) ?? id);
}
