/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { infra, timerange } from '@kbn/synthtrace-client';

export function generatePodsData({
  from,
  to,
  count = 1,
}: {
  from: string;
  to: string;
  count: number;
}) {
  const range = timerange(from, to);

  const pods = Array(count)
    .fill(0)
    .map((_, idx) => infra.pod(`pod-${idx}`, `node-name-${idx}`));

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      pods.flatMap((pod, idx) => [
        pod.metrics().timestamp(timestamp),
        pod.container(`k8s-container-${idx}`).metrics().timestamp(timestamp),
      ])
    );
}
