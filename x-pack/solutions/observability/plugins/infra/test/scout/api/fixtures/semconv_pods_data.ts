/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  infra,
  timerange,
  type InfraDocument,
  type SynthtraceGenerator,
} from '@kbn/synthtrace-client';

export interface SemconvPodFixture {
  uid: string;
  name: string;
  nodeName: string;
  withoutLimits?: boolean;
  /** Pod has kubeletstats cpu and network docs, and no memory fields. */
  omitMemory?: boolean;
  interfaces?: string[];
}

export const SEMCONV_PODS_DATA_FROM = '2019-07-10T20:20:00.000Z';
export const SEMCONV_PODS_DATA_TO = '2019-07-10T20:30:00.000Z';

export const SEMCONV_PODS: SemconvPodFixture[] = [
  { uid: 'semconv-pod-0-uid', name: 'semconv-pod-0', nodeName: 'semconv-host-1' },
  {
    uid: 'semconv-pod-1-uid',
    name: 'semconv-pod-1',
    nodeName: 'semconv-host-1',
    withoutLimits: true,
  },
  {
    uid: 'semconv-pod-2',
    name: 'semconv-pod-2',
    nodeName: 'semconv-host-2',
    interfaces: ['eth0', 'net1'],
  },
  {
    uid: 'semconv-pod-3',
    name: 'semconv-pod-3',
    nodeName: 'semconv-host-2',
    omitMemory: true,
  },
];

/**
 * Generates OpenTelemetry `kubeletstatsreceiver.otel` pod docs (cpu, memory,
 * network). Mirrors the UI Scout fixture under
 * `test/scout/ui/fixtures/synthtrace/semconv_pods_data.ts`.
 */
export function generateSemconvPodsData({
  from,
  to,
  pods,
}: {
  from: string;
  to: string;
  pods: SemconvPodFixture[];
}): SynthtraceGenerator<InfraDocument> {
  const range = timerange(from, to);
  const podList = pods.map((pod) => ({
    entity: infra.semconvPod(pod.uid, pod.nodeName, { name: pod.name }),
    withoutLimits: pod.withoutLimits === true,
    omitMemory: pod.omitMemory === true,
    interfaces: pod.interfaces,
  }));

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      podList.flatMap((pod) => {
        // Stagger by 1 ms per doc — TSDB derives _id from dimensions that exclude
        // `direction` / `interface`, so identical @timestamp + metricset = duplicate _id.
        const docs = pod.omitMemory
          ? [...pod.entity.cpu(), ...pod.entity.network({ interfaces: pod.interfaces })]
          : pod.withoutLimits
          ? [
              ...pod.entity.cpuWithoutLimit(),
              ...pod.entity.memoryWithoutLimit(),
              ...pod.entity.network({ interfaces: pod.interfaces }),
            ]
          : pod.entity.metrics({ interfaces: pod.interfaces });
        return docs.map((doc, i) => doc.timestamp(timestamp + i));
      })
    );
}
