/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates infrastructure metrics for a number of Kubernetes containers.
 */

import type { InfraDocument } from '@kbn/synthtrace-client';
import { infra, generateShortId } from '@kbn/synthtrace-client';

import type { Scenario } from '@kbn/synthtrace';
import { withClient, getNumberOpt } from '@kbn/synthtrace';

const scenario: Scenario<InfraDocument> = async (runOptions) => {
  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      const numContainers = getNumberOpt(runOptions.scenarioOpts, 'numContainers', 5);
      const { logger } = runOptions;

      const CONTAINERS = Array(numContainers)
        .fill(0)
        .map((_, idx) => {
          const id = generateShortId();
          return infra.k8sContainer(id, `pod-${idx}`, `node-${idx}`);
        });

      const containers = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          CONTAINERS.flatMap((container) => [container.metrics().timestamp(timestamp)])
        );

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_infra_containers', () => containers)
        ),
      ];
    },
  };
};

export default scenario;
