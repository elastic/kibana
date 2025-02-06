/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { verifyDockerInstalled } from '@kbn/es';
import assert from 'assert';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';
import execa from 'execa';
import { dump } from 'js-yaml';
import {
  fetchFleetServerUrl,
  getAgentVersionMatchingCurrentStack,
  waitForHostToEnroll,
} from './fleet_services';

interface StartedElasticAgent {
  /** The type of virtualization used to start the agent */
  type: 'docker';
  /** The ID of the agent */
  id: string;
  /** The name of the agent */
  name: string;
  /** Stop agent */
  stop: () => Promise<void>;
  /** Any information about the agent */
  info?: string;
}

interface StartElasticAgentWithDockerOptions {
  kbnClient: KbnClient;
  logger: ToolingLog;
  containerName?: string;
  /** The enrollment token for Elastic Agent */
  enrollmentToken?: string;
  version?: string;
}

export const startElasticAgentWithDocker = async ({
  kbnClient,
  logger: log,
  enrollmentToken = '',
  version,
  containerName = 'elastic-agent',
}: StartElasticAgentWithDockerOptions): Promise<StartedElasticAgent> => {
  await verifyDockerInstalled(log);

  const agentVersion = version || (await getAgentVersionMatchingCurrentStack(kbnClient));

  log.info(`Starting a new Elastic agent using Docker (version: ${agentVersion})`);

  const response: StartedElasticAgent = await log.indent(4, async () => {
    const fleetServerUrl = await fetchFleetServerUrl(kbnClient);
    const hostname = `${containerName}.${Math.random().toString(32).substring(2, 6)}`;
    let containerId = '';
    let elasticAgentVersionInfo = '';

    assert.ok(!!fleetServerUrl, '`fleetServerUrl` is required');
    assert.ok(!!enrollmentToken, '`enrollmentToken` is required');

    try {
      const dockerArgs = getElasticAgentDockerArgs({
        containerName: hostname,
        hostname,
        enrollmentToken,
        agentVersion,
        fleetServerUrl: fleetServerUrl as string,
      });

      await execa('docker', ['kill', containerName])
        .then(() => {
          log.verbose(
            `Killed an existing container with name [${containerName}]. New one will be started.`
          );
        })
        .catch((error) => {
          if (!/no such container/i.test(error.message)) {
            log.verbose(`Attempt to kill currently running elastic-agent container with name [${containerName}] was unsuccessful:
      ${error}`);
          }
        });

      log.verbose(`docker arguments:\n${dockerArgs.join(' ')}`);

      containerId = (await execa('docker', dockerArgs)).stdout;

      log.info(`Elastic agent container started`);

      {
        log.info('Waiting for Elastic Agent to show up in Kibana Fleet');

        const elasticAgent = await waitForHostToEnroll(kbnClient, log, hostname, 120000);

        log.verbose(`Enrolled agent:\n${JSON.stringify(elasticAgent, null, 2)}`);
      }

      elasticAgentVersionInfo = (
        await execa('docker', [
          'exec',
          containerName,
          '/bin/bash',
          '-c',
          './elastic-agent version',
        ]).catch((err) => {
          log.verbose(`Failed to retrieve agent version information from running instance.`, err);
          return { stdout: 'Unable to retrieve version information' };
        })
      ).stdout;
    } catch (error) {
      log.error(dump(error));
      throw error;
    }

    const info = `Container Name: ${containerName}
Container Id:   ${containerId}
Elastic Agent version:
    ${elasticAgentVersionInfo.replace(/\n/g, '\n    ')}

View running output:  ${chalk.cyan(`docker attach ---sig-proxy=false ${containerName}`)}
Shell access:         ${chalk.cyan(`docker exec -it ${containerName} /bin/bash`)}
Kill container:       ${chalk.cyan(`docker kill ${containerId}`)}
  `;

    return {
      type: 'docker',
      name: containerName,
      id: containerId,
      info,
      stop: async () => {
        await execa('docker', ['kill', containerId]);
      },
    };
  });

  log.info(`Done. Elastic agent up and running`);

  return response;
};

interface GetElasticAgentDockerArgsOptions {
  containerName: string;
  fleetServerUrl: string;
  enrollmentToken: string;
  agentVersion: string;
  /** The hostname. Defaults to `containerName` */
  hostname?: string;
}

const getElasticAgentDockerArgs = ({
  hostname,
  enrollmentToken,
  fleetServerUrl,
  containerName,
  agentVersion,
}: GetElasticAgentDockerArgsOptions): string[] => {
  return [
    'run',
    '--net',
    'elastic',
    '--detach',
    '--add-host',
    'host.docker.internal:host-gateway',
    '--name',
    containerName,
    // The container's hostname will appear in Fleet when the agent enrolls
    '--hostname',
    hostname || containerName,
    '--env',
    'FLEET_ENROLL=1',
    '--env',
    `FLEET_URL=${fleetServerUrl}`,
    '--env',
    `FLEET_ENROLLMENT_TOKEN=${enrollmentToken}`,
    '--env',
    'FLEET_INSECURE=true',
    '--rm',
    `docker.elastic.co/elastic-agent/elastic-agent:${agentVersion}`,
  ];
};
