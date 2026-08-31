/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates infrastructure metrics for a number of Kubernetes pods.
 */

import type { InfraDocument } from '@kbn/synthtrace-client';
import { infra } from '@kbn/synthtrace-client';

import type { Scenario } from '@kbn/synthtrace';
import { withClient, getNumberOpt } from '@kbn/synthtrace';

const scenario: Scenario<InfraDocument> = async (runOptions) => {
  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      const numPods = getNumberOpt(runOptions.scenarioOpts, 'numPods', 5);
      const { logger } = runOptions;

      const PODS = Array(numPods)
        .fill(0)
        .map((_, idx) => {
          // Deterministic pod UIDs for synthtrace fixtures — not security-sensitive
          // (avoids CodeQL js/insecure-randomness on generateShortId / Math.random).
          const uid = `pod-${idx}`;
          return infra.pod(uid, `node-${idx}`);
        });

      const pods = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) => PODS.flatMap((pod) => [pod.metrics().timestamp(timestamp)]));

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_infra_pods', () => pods)
        ),
      ];
    },
  };
};

export default scenario;
