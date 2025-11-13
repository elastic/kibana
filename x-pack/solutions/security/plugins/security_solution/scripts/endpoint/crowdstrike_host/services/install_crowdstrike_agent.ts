/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import pRetry, { AbortError } from 'p-retry';
import { userInfo } from 'os';
import { fetchActiveSpace } from '../../common/spaces';
import {
  createMultipassHostVmClient,
  createVm,
  findVm,
  generateVmName,
} from '../../common/vm_services';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';
import type { HostVm } from '../../common/types';
import { dump } from '../../common/utils';

export interface OnboardVmHostWithCrowdStrikeOptions {
  kbnClient: KbnClient;
  sensorInstaller: string;
  customerId: string;
  log?: ToolingLog;
  vmName?: string;
  forceNewCrowdStrikeHost?: boolean;
}

export const onboardVmHostWithCrowdStrike = async ({
  kbnClient,
  log = createToolingLogger(),
  vmName: _vmName,
  forceNewCrowdStrikeHost,
  sensorInstaller,
  customerId,
}: OnboardVmHostWithCrowdStrikeOptions): Promise<HostVm> => {
  const activeSpaceId = (await fetchActiveSpace(kbnClient)).id;
  const vmName = _vmName || generateVmName(`crowdstrike-${activeSpaceId}`);
  const hostVmNameAlreadyRunning = (
    await findVm(
      'multipass',
      _vmName ? _vmName : new RegExp(`^${vmName.substring(0, vmName.lastIndexOf('-'))}`)
    )
  ).data[0];

  if (!forceNewCrowdStrikeHost && hostVmNameAlreadyRunning) {
    log?.info(
      `A host VM with CrowdStrike Falcon sensor is already running - will reuse it.\nTIP: Use 'forceNewCrowdStrikeHost' to force the creation of a new one if desired`
    );

    return createMultipassHostVmClient(hostVmNameAlreadyRunning, log);
  }

  const hostVm = await createVm({
    type: 'multipass',
    name: vmName,
    log,
    memory: '4G',
    image: 'release:22.04',
  });

  log.info(`Using sensor installer: ${sensorInstaller}`);

  const vmSensorFile = await hostVm.upload(
    sensorInstaller,
    '/home/ubuntu/crowdstrike-falcon-sensor.deb'
  );

  log.info(`Installing CrowdStrike Falcon sensor`);
  await log.indent(4, async () => {
    log.debug(`Installing sensor package [${vmSensorFile.filePath}]`);
    await hostVm.exec(`sudo dpkg -i ${vmSensorFile.filePath}`);

    log.debug(`Configuring Falcon sensor with Customer ID`);
    // Set the Customer ID for enrollment
    await hostVm.exec(`sudo /opt/CrowdStrike/falconctl -s --cid=${customerId}`);

    // Configure the sensor with tags for dev environment
    // CrowdStrike tags should be comma-separated and can contain alphanumeric characters, hyphens, and underscores
    const devTag = `ElasticDev_${userInfo().username.toLowerCase().replaceAll('.', '_')}`;
    await hostVm.exec(`sudo /opt/CrowdStrike/falconctl -s --tags=${devTag}`);

    log.debug(`Configured sensor with tag: ${devTag}`);

    log.info(`Starting CrowdStrike Falcon sensor`);
    await hostVm.exec('sudo systemctl start falcon-sensor');
    await hostVm.exec('sudo systemctl enable falcon-sensor');

    await waitForCrowdStrikeFalconOnVmToReportHealthy(hostVm, log);

    // Display sensor status
    await hostVm.exec('sudo /opt/CrowdStrike/falconctl -g --cid');
  });

  log.info(`Done. A VM [${vmName}] was created and onboarded to CrowdStrike Falcon`);

  return hostVm;
};

const waitForCrowdStrikeFalconOnVmToReportHealthy = async (vm: HostVm, log: ToolingLog) => {
  log.info(
    `Waiting for CrowdStrike Falcon sensor to report healthy status (this could take a bit of time)`
  );

  return log.indent(4, async () => {
    const command = 'sudo /opt/CrowdStrike/falconctl -g --aid';

    await pRetry(
      async (attempts) => {
        const aidFieldValue = (
          await vm.exec(command).catch((err) => {
            log.verbose(dump(err));

            throw new AbortError(`Received error while running [${command}]: ${err.message}`);
          })
        ).stdout;

        if (!aidFieldValue || aidFieldValue.trim() === '') {
          if (attempts % 5 === 0) {
            log.info('Still waiting...');
          }

          throw new Error(`Agent ID not available after ${attempts} attempts`);
        }

        log.info(`CrowdStrike Falcon sensor is healthy with AID: ${aidFieldValue.trim()}`);
      },
      { retries: 30 }
    );
  });
};
