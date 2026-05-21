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
 * Generates ECS-compliant infrastructure host metrics.
 * This scenario satisfies the 'ecs' schema requirement in getPreferredSchema.
 */
const scenario: Scenario<InfraDocument> = async ({ logger, scenarioOpts }) => {
  const numHosts = getNumberOpt(scenarioOpts, 'numHosts', 2);

  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      // Create ECS hosts
      const hostList = times(numHosts).map((index) => infra.host(`ecs-host-${index}`));

      const hosts = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          hostList.flatMap((host) => [
            // Standard ECS metrics (system.cpu.*, system.memory.*, etc.)
            host.cpu().timestamp(timestamp),
            host.memory().timestamp(timestamp),
            host.network().timestamp(timestamp),
            host.load().timestamp(timestamp),
            host.filesystem().timestamp(timestamp),
            host.diskio().timestamp(timestamp),
          ])
        );

      return withClient(
        infraEsClient,
        logger.perf('generating_ecs_hosts', () => hosts)
      );
    },
  };
};

export default scenario;
