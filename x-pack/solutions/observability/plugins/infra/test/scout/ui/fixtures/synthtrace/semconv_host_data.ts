/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { infra, timerange } from '@kbn/synthtrace-client';

export function generateSemconvHostData({
  from,
  to,
  hosts,
}: {
  from: string;
  to: string;
  hosts: Array<{ hostName: string }>;
}) {
  const range = timerange(from, to);
  const hostList = hosts.map(({ hostName }) => infra.semconvHost(hostName));

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      hostList.flatMap((host) => {
        // Stagger by 1 ms per doc — TSDB derives _id from dimensions that exclude
        // `state`/`direction`, so identical @timestamp + metricset = duplicate _id.
        const docs = [...host.cpu(), ...host.memory(), ...host.filesystem(), ...host.network()];
        return docs.map((doc, i) => doc.timestamp(timestamp + i));
      })
    );
}
