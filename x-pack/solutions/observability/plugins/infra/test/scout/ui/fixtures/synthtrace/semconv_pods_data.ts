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
import type { SemconvPodFixture } from '../constants';

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
    interfaces: pod.interfaces,
  }));

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      podList.flatMap((pod) => {
        // Stagger by 1 ms per doc — TSDB derives _id from dimensions that exclude
        // `direction` / `interface`, so identical @timestamp + metricset = duplicate _id.
        const docs = pod.withoutLimits
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
