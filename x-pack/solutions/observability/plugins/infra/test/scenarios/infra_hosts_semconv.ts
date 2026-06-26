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
import { withClient } from '@kbn/synthtrace';
import { getNumberOpt } from '@kbn/synthtrace';

/**
 * Generates OpenTelemetry (semconv) infrastructure host metrics.
 * This scenario satisfies the 'semconv' schema requirement in getPreferredSchema.
 */
const scenario: Scenario<InfraDocument> = async ({ logger, scenarioOpts }) => {
  const numHosts = getNumberOpt(scenarioOpts, 'numHosts', 2);

  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      const hostList = times(numHosts).map((index) => infra.semconvHost(`semconv-host-${index}`));

      const metrics = range
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

      return withClient(
        infraEsClient,
        logger.perf('generating_semconv_hosts', () => metrics)
      );
    },
  };
};

export default scenario;
