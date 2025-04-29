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

const MDE_INSTALLER_FILE_URL =
  'https://raw.githubusercontent.com/microsoft/mdatp-xplat/refs/heads/master/linux/installation/mde_installer.sh';

export interface OnboardVmHostWithMicrosoftDefenderOptions {
  kbnClient: KbnClient;
  onboardingPackage: string;
  log?: ToolingLog;
  vmName?: string;
  forceNewHost?: boolean;
}

export const onboardVmHostWithMicrosoftDefender = async ({
  kbnClient,
  log = createToolingLogger(),
  vmName: _vmName,
  forceNewHost,
  onboardingPackage,
}: OnboardVmHostWithMicrosoftDefenderOptions): Promise<HostVm> => {
  const activeSpaceId = (await fetchActiveSpace(kbnClient)).id;
  const vmName = _vmName || generateVmName(`msdefender-${activeSpaceId}`);
  const hostVmNameAlreadyRunning = (
    await findVm(
      'multipass',
      _vmName ? _vmName : new RegExp(`^${vmName.substring(0, vmName.lastIndexOf('-'))}`)
    )
  ).data[0];

  if (!forceNewHost && hostVmNameAlreadyRunning) {
    log?.info(
      `A host VM with Microsoft Defender for Endpoint is already running - will reuse it.\nTIP: Use 'forceNewHost' to force the creation of a new one if desired`
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

  const vmOnboardingFile = await hostVm.upload(
    onboardingPackage,
    '/home/ubuntu/GatewayWindowsDefenderATPOnboardingPackage.zip'
  );

  log.debug(`installing zip utility on VM`);
  await hostVm.exec('sudo apt -y install zip');

  log.debug(`Extracting contents of [${vmOnboardingFile.filePath}]`);
  await hostVm.exec(`unzip ${vmOnboardingFile.filePath}`);

  log.debug(`Downloading installer script from GitHub onto VM [${MDE_INSTALLER_FILE_URL}]`);
  await hostVm.exec(`curl -o /home/ubuntu/mde_installer.sh -X GET ${MDE_INSTALLER_FILE_URL}`);

  log.debug(`Adding execute permission to file [/home/ubuntu/mde_installer.sh]`);
  await hostVm.exec(`chmod +x /home/ubuntu/mde_installer.sh`);

  log.info(`Running Microsoft installer and onboarding scripts`);
  await hostVm.exec(
    'sudo OPT_FOR_MDE_ARM_PREVIEW=true /home/ubuntu/mde_installer.sh ' +
      '--install ' +
      '--channel prod ' +
      '--onboard /home/ubuntu/MicrosoftDefenderATPOnboardingLinuxServer.py ' +
      `--tag GROUP ElasticDev-${userInfo().username.toLowerCase().replaceAll('.', '-')} ` +
      '--min_req -y'
  );

  log.info('Enabling real time protections on host');
  await hostVm.exec('sudo mdatp config real-time-protection --value enabled');

  await waitForMicrosoftDefenderOnVmToReportHealthy(hostVm, log);

  await hostVm.exec('sudo mdatp health');

  log.info(`Done. A VM [${vmName}] was created and onboarded to Microsoft Defender for Endpoint`);

  return hostVm;
};

const waitForMicrosoftDefenderOnVmToReportHealthy = async (vm: HostVm, log: ToolingLog) => {
  log.info(
    `Waiting for Microsoft Defender to report healthy status (this could take a bit of time)`
  );

  return log.indent(4, async () => {
    const command = 'sudo mdatp health --field healthy';

    await pRetry(
      async (attempts) => {
        const healthyFieldValue = (
          await vm.exec(command).catch((err) => {
            log.verbose(dump(err));

            throw new AbortError(`Received error while running [${command}]: err.message`);
          })
        ).stdout;

        if (healthyFieldValue !== 'true') {
          if (attempts % 5 === 0) {
            log.info('Still waiting...');
          }

          throw new Error(`Healthy field is not reporting 'true' after ${attempts} attempts`);
        }
      },
      { retries: 30 }
    );
  });
};
