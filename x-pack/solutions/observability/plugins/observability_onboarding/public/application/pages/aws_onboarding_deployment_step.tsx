/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AwsService } from './ingest_hub/aws_services_data';
import {
  buildAwsDeploymentPlan,
  isLaneConfigComplete,
  resolveS3LogsDeliveryMethod,
  type AwsDeploymentConfigValues,
} from './ingest_hub/aws_deployment_plan';
import { AwsDeploymentLanesPanel } from './ingest_hub/aws_deployment_lanes_panel';
import {
  AwsAgentBasedSetupPanel,
  AwsCloudForwarderLogSourcesPanel,
  AwsFirehoseSetupPanel,
  type AwsAgentBasedHostTargetId,
  type AwsCloudForwarderLogSource,
  type AwsFirehoseSetupPathId,
} from './aws_onboarding_deployment_panels';

const INITIAL_CLOUD_FORWARDER_LOG_SOURCES: AwsCloudForwarderLogSource[] = [
  {
    id: 'cf-src-initial',
    bucket: '',
    logType: '',
    region: 'us-east-1',
  },
];

function resolveExclusiveS3LogsDeliveryChoice(params: {
  readonly userChoice: 'cloud_forwarder' | 'firehose';
  readonly supportsCloudForwarder: boolean;
  readonly supportsFirehose: boolean;
}): 'cloud_forwarder' | 'firehose' {
  const { userChoice, supportsCloudForwarder, supportsFirehose } = params;
  if (!supportsCloudForwarder && supportsFirehose) {
    return 'firehose';
  }
  if (supportsCloudForwarder && !supportsFirehose) {
    return 'cloud_forwarder';
  }
  return userChoice;
}

function isDeploymentStepComplete(params: {
  readonly manualServiceIds: ReadonlySet<string>;
  readonly config: AwsDeploymentConfigValues;
  readonly s3LogsDeliveryChoice: 'cloud_forwarder' | 'firehose';
  readonly cloudForwarderLogSources: readonly AwsCloudForwarderLogSource[];
  readonly firehoseElasticEndpoint: string;
  readonly agentBasedHostTarget: AwsAgentBasedHostTargetId;
  readonly agentBasedNewPolicyName: string;
  readonly agentBasedExistingPolicyId: string;
}): boolean {
  const plan = buildAwsDeploymentPlan(params.manualServiceIds);
  if (plan.lanes.length === 0) {
    return false;
  }

  return plan.lanes.every((lane) => {
    const s3LogsDeliveryChoiceForLane =
      lane.id === 's3_logs'
        ? resolveExclusiveS3LogsDeliveryChoice({
            userChoice: params.s3LogsDeliveryChoice,
            supportsCloudForwarder: lane.supportsCloudForwarder,
            supportsFirehose: lane.supportsFirehose,
          })
        : params.s3LogsDeliveryChoice;

    if (
      !isLaneConfigComplete({
        lane,
        config: params.config,
        s3LogsDeliveryChoice: s3LogsDeliveryChoiceForLane,
      })
    ) {
      return false;
    }

    if (lane.id === 's3_logs') {
      const s3Method = resolveS3LogsDeliveryMethod({
        choice: s3LogsDeliveryChoiceForLane,
        lane,
      });
      if (s3Method === 'cloud_forwarder') {
        return (
          params.cloudForwarderLogSources.length > 0 &&
          params.cloudForwarderLogSources.every(
            (source) => source.bucket.trim().length > 0 && source.logType.trim().length > 0
          )
        );
      }
      return params.firehoseElasticEndpoint.trim().length > 0;
    }

    if (lane.id === 'agent_based') {
      if (params.agentBasedHostTarget === 'new_hosts') {
        return params.agentBasedNewPolicyName.trim().length > 0;
      }
      return params.agentBasedExistingPolicyId.trim().length > 0;
    }

    return true;
  });
}

export interface AwsOnboardingDeploymentStepProps {
  readonly manualServiceIds: ReadonlySet<string>;
  readonly catalog: readonly AwsService[];
  readonly onCanContinueChange: (canContinue: boolean) => void;
}

/** Self-contained deployment step: owns form state and reports validity to the parent. */
export const AwsOnboardingDeploymentStep: React.FC<AwsOnboardingDeploymentStepProps> = ({
  manualServiceIds,
  catalog,
  onCanContinueChange,
}) => {
  const selectionKey = useMemo(() => [...manualServiceIds].sort().join(','), [manualServiceIds]);

  const [config, setConfig] = useState<AwsDeploymentConfigValues>({});
  const [s3LogsDeliveryChoice, setS3LogsDeliveryChoice] = useState<'cloud_forwarder' | 'firehose'>(
    'cloud_forwarder'
  );
  const [cloudForwarderLogSources, setCloudForwarderLogSources] = useState(
    INITIAL_CLOUD_FORWARDER_LOG_SOURCES
  );
  const [firehoseSetupPath, setFirehoseSetupPath] = useState<AwsFirehoseSetupPathId>('console');
  const [firehoseElasticEndpoint, setFirehoseElasticEndpoint] = useState('');
  const [agentBasedHostTarget, setAgentBasedHostTarget] =
    useState<AwsAgentBasedHostTargetId>('new_hosts');
  const [agentBasedNewPolicyName, setAgentBasedNewPolicyName] = useState('');
  const [agentBasedCollectSystemLogs, setAgentBasedCollectSystemLogs] = useState(true);
  const [agentBasedExistingPolicyId, setAgentBasedExistingPolicyId] = useState('');

  useEffect(() => {
    setConfig({});
    setS3LogsDeliveryChoice('cloud_forwarder');
    setCloudForwarderLogSources(INITIAL_CLOUD_FORWARDER_LOG_SOURCES);
    setFirehoseSetupPath('console');
    setFirehoseElasticEndpoint('');
    setAgentBasedHostTarget('new_hosts');
    setAgentBasedNewPolicyName('');
    setAgentBasedCollectSystemLogs(true);
    setAgentBasedExistingPolicyId('');
  }, [selectionKey]);

  const plan = useMemo(() => buildAwsDeploymentPlan(manualServiceIds), [manualServiceIds]);

  const onConfigChange = useCallback((patch: AwsDeploymentConfigValues) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const canContinue = useMemo(
    () =>
      isDeploymentStepComplete({
        manualServiceIds,
        config,
        s3LogsDeliveryChoice,
        cloudForwarderLogSources,
        firehoseElasticEndpoint,
        agentBasedHostTarget,
        agentBasedNewPolicyName,
        agentBasedExistingPolicyId,
      }),
    [
      agentBasedExistingPolicyId,
      agentBasedHostTarget,
      agentBasedNewPolicyName,
      cloudForwarderLogSources,
      config,
      firehoseElasticEndpoint,
      manualServiceIds,
      s3LogsDeliveryChoice,
    ]
  );

  useEffect(() => {
    onCanContinueChange(canContinue);
  }, [canContinue, onCanContinueChange]);

  useEffect(() => {
    return () => {
      onCanContinueChange(false);
    };
  }, [onCanContinueChange]);

  const s3Lane = plan.lanes.find((lane) => lane.id === 's3_logs');
  const s3LogsDeliveryChoiceForLane = s3Lane
    ? resolveExclusiveS3LogsDeliveryChoice({
        userChoice: s3LogsDeliveryChoice,
        supportsCloudForwarder: s3Lane.supportsCloudForwarder,
        supportsFirehose: s3Lane.supportsFirehose,
      })
    : s3LogsDeliveryChoice;

  let s3LogsSetup: React.ReactNode = null;
  if (s3Lane) {
    const s3Method = resolveS3LogsDeliveryMethod({
      choice: s3LogsDeliveryChoiceForLane,
      lane: s3Lane,
    });
    s3LogsSetup =
      s3Method === 'cloud_forwarder' ? (
        <AwsCloudForwarderLogSourcesPanel
          sources={cloudForwarderLogSources}
          onSourcesChange={setCloudForwarderLogSources}
        />
      ) : (
        <AwsFirehoseSetupPanel
          setupPath={firehoseSetupPath}
          onSetupPathChange={setFirehoseSetupPath}
          elasticEndpoint={firehoseElasticEndpoint}
          onElasticEndpointChange={setFirehoseElasticEndpoint}
        />
      );
  }

  return (
    <AwsDeploymentLanesPanel
      plan={plan}
      catalog={catalog}
      config={config}
      onConfigChange={onConfigChange}
      s3LogsDeliveryChoice={s3LogsDeliveryChoiceForLane}
      onS3LogsDeliveryChoiceChange={setS3LogsDeliveryChoice}
      s3LogsSetup={s3LogsSetup}
      agentBasedSetup={
        plan.lanes.some((lane) => lane.id === 'agent_based') ? (
          <AwsAgentBasedSetupPanel
            hostTarget={agentBasedHostTarget}
            onHostTargetChange={setAgentBasedHostTarget}
            newPolicyName={agentBasedNewPolicyName}
            onNewPolicyNameChange={setAgentBasedNewPolicyName}
            collectSystemLogs={agentBasedCollectSystemLogs}
            onCollectSystemLogsChange={setAgentBasedCollectSystemLogs}
            existingPolicyId={agentBasedExistingPolicyId}
            onExistingPolicyIdChange={setAgentBasedExistingPolicyId}
          />
        ) : undefined
      }
    />
  );
};
