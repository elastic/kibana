/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timerange, apm, log } from '@kbn/synthtrace-client';
import type { LogsSynthtraceEsClient, ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export async function createRichChangeEventsData({
  getService,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
}): Promise<{
  logsSynthtraceEsClient: LogsSynthtraceEsClient;
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
}> {
  const synthtrace = getService('synthtrace');
  const logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();
  const apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

  await logsSynthtraceEsClient.clean();
  await apmSynthtraceEsClient.clean();

  // Use a 1h window relative to 'now'
  const range = timerange('now-1h', 'now');

  const start = range.from.valueOf();
  const end = range.to.valueOf();

  // Relative times based on the scenario
  const T_MINUS_50 = end - 50 * 60 * 1000;
  const T_MINUS_45 = end - 45 * 60 * 1000;
  const T_MINUS_40 = end - 40 * 60 * 1000;
  const T_MINUS_30 = end - 30 * 60 * 1000;
  const T_MINUS_20 = end - 20 * 60 * 1000;
  const T_MINUS_10 = end - 10 * 60 * 1000;

  // --- 1. Logs Generation ---
  const logData = range.interval('1m').generator((timestamp) => {
    const events = [];

    // K8s Deployment Rollout (v2.0.0)
    if (timestamp >= T_MINUS_45 && timestamp < T_MINUS_45 + 60000) {
      events.push(
        log
          .create()
          .timestamp(timestamp)
          .message('Scaled up replica set checkout-service-v2-0-0 to 1')
          .service('checkout-service')
          .defaults({
            'event.category': 'deployment',
            'k8s.event.reason': 'ScalingReplicaSet',
            'k8s.event.action': 'ScalingReplicaSet',
            'k8s.object.kind': 'Deployment',
            'k8s.object.name': 'checkout-service',
            'k8s.deployment.name': 'checkout-service',
            'service.version': '2.0.0',
            'deployment.environment.name': 'production',
            'service.environment': 'production',
          }),
        log
          .create()
          .timestamp(timestamp + 1000)
          .message('Created pod: checkout-service-v2-0-0-abcde')
          .service('checkout-service')
          .defaults({
            'k8s.event.reason': 'SuccessfulCreate',
            'k8s.object.kind': 'ReplicaSet',
            'k8s.object.name': 'checkout-service-v2',
            'deployment.environment.name': 'production',
          })
      );
    }

    // Configuration Change (ConfigMap Sync)
    if (timestamp >= T_MINUS_30 && timestamp < T_MINUS_30 + 60000) {
      events.push(
        log
          .create()
          .timestamp(timestamp)
          .message('Configuration synced successfully')
          .service('checkout-service')
          .defaults({
            'event.category': 'configuration',
            'k8s.event.reason': 'Sync',
            'k8s.object.kind': 'ConfigMap',
            'k8s.object.name': 'checkout-config',
            'deployment.environment.name': 'production',
            message: 'Configuration update: payment-timeout set to 5000ms',
          })
      );
    }

    // Feature Flag Toggle (OTel SemConv)
    if (timestamp >= T_MINUS_20 && timestamp < T_MINUS_20 + 60000) {
      events.push(
        log
          .create()
          .timestamp(timestamp)
          .message('Feature flag evaluated')
          .service('checkout-service')
          .defaults({
            'event.name': 'feature_flag.evaluation',
            'feature_flag.key': 'enable_ai_recommendations',
            'feature_flag.variant': 'on',
            'feature_flag.provider.name': 'flag-provider-x',
            'service.name': 'checkout-service',
            'deployment.environment.name': 'production',
          })
      );
    }

    // Scaling Event (HPA)
    if (timestamp >= T_MINUS_10 && timestamp < T_MINUS_10 + 60000) {
      events.push(
        log
          .create()
          .timestamp(timestamp)
          .message('New size: 5; reason: cpu resource utilization (above target)')
          .service('checkout-service')
          .defaults({
            'event.action': 'scaling',
            'k8s.event.reason': 'HorizontalPodAutoscaler',
            'k8s.object.kind': 'HorizontalPodAutoscaler',
            'k8s.object.name': 'checkout-hpa',
            'deployment.environment.name': 'production',
          })
      );
    }

    return events;
  });

  // --- 2. Traces Generation (CI/CD & Version Change) ---
  const service = apm
    .service('checkout-service', 'production', 'nodejs')
    .instance('checkout-instance');

  const traceData = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      const docs = [];

      // CI/CD Pipeline Trace (at T-50m)
      if (timestamp >= T_MINUS_50 && timestamp < T_MINUS_50 + 60000) {
        // We manually construct a span that looks like a CI/CD run
        const pipelineSpan = service
          .transaction('deploy-checkout-v2', 'unknown')
          .timestamp(timestamp)
          .duration(5000)
          .success()
          .defaults({
            'cicd.pipeline.name': 'deploy-checkout-v2',
            'cicd.pipeline.run.id': 'run-12345',
            'cicd.pipeline.result': 'success',
            'cicd.pipeline.task.type': 'deploy',
            'service.name': 'github-actions',
          });
        docs.push(pipelineSpan);
      }

      // Regular Traffic: Version 1.5.0 (Before T-40m)
      if (timestamp < T_MINUS_40) {
        docs.push(
          service
            .transaction('POST /checkout', 'request')
            .timestamp(timestamp)
            .defaults({ 'service.version': '1.5.0' })
            .success()
        );
      }
      // Regular Traffic: Version 2.0.0 (After T-40m)
      else {
        docs.push(
          service
            .transaction('POST /checkout', 'request')
            .timestamp(timestamp)
            .defaults({ 'service.version': '2.0.0' })
            .success()
        );
      }

      return docs;
    });

  await Promise.all([
    logsSynthtraceEsClient.index(logData),
    apmSynthtraceEsClient.index(traceData),
  ]);

  return { logsSynthtraceEsClient, apmSynthtraceEsClient };
}
