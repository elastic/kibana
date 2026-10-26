/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfraDocument } from '@kbn/synthtrace-client';
import { infra } from '@kbn/synthtrace-client';
import { times } from 'lodash';
import type { Scenario } from '@kbn/synthtrace';
import { getBooleanOpt, getNumberOpt, withClient } from '@kbn/synthtrace';

/**
 * Generates OpenTelemetry (kubeletstats) Kubernetes pod metrics, plus a hostmetrics document per
 * node. The Metric Detail metadata strip resolves a pod through `k8s.node.name` and then looks the
 * node up as a host, so without the node documents that strip stays empty.
 */
const scenario: Scenario<InfraDocument> = async ({ logger, scenarioOpts }) => {
  const numPods = getNumberOpt(scenarioOpts, 'numPods', 5);
  const numNodes = getNumberOpt(scenarioOpts, 'numNodes', 2);
  const withoutLimits = getBooleanOpt(scenarioOpts, 'withoutLimits', false);

  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      const podList = times(numPods).map((index) => {
        const uid = index === 1 ? 'semconv-pod-1-uid' : `semconv-pod-${index}`;
        const nodeName = `semconv-host-${index % numNodes}`;
        const name = index === 1 ? 'semconv-pod-1' : uid;
        return {
          entity: infra.semconvPod(uid, nodeName, { name }),
          omitLimits: withoutLimits && index % 2 === 1,
          interfaces: index === 2 ? ['eth0', 'net1'] : ['eth0'],
        };
      });

      const nodeList = times(numNodes).map((index) => infra.semconvHost(`semconv-host-${index}`));

      // Stagger by 1 ms per doc — TSDB derives _id from dimensions that exclude `direction` /
      // `interface`, so identical @timestamp + metricset = duplicate _id.
      const nodeMetrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          nodeList
            .flatMap((node) => [...node.cpu(), ...node.memory()])
            .map((doc, i) => doc.timestamp(timestamp + i))
        );

      const podMetrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          podList
            .flatMap((pod) =>
              pod.omitLimits
                ? [
                    ...pod.entity.cpuWithoutLimit(),
                    ...pod.entity.memoryWithoutLimit(),
                    ...pod.entity.network({ interfaces: pod.interfaces }),
                  ]
                : pod.entity.metrics({ interfaces: pod.interfaces })
            )
            .map((doc, i) => doc.timestamp(timestamp + i))
        );

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_semconv_pod_nodes', () => nodeMetrics)
        ),
        withClient(
          infraEsClient,
          logger.perf('generating_semconv_pods', () => podMetrics)
        ),
      ];
    },
  };
};

export default scenario;
