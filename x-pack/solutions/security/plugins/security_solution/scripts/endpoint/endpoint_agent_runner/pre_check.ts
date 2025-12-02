/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import type { SupportedVmManager } from '../common/types';
import { getRuntimeServices } from './runtime';

export const checkDependencies = async () => {
  const { log } = getRuntimeServices();

  log.info(`Checking dependencies`);

  // TODO:PT validate that ES / KBN is reachable

  await Promise.all([checkDocker(), checkVmRunner()]);
};

const checkDocker = async () => {
  const { log } = getRuntimeServices();

  try {
    const dockerVersion = await execa('docker', ['--version']);

    log.verbose(`Using docker: ${dockerVersion.stdout}`);
  } catch (err) {
    log.verbose(err);
    throw new Error(
      `Docker not found on local machine [${err.message}]. Install it from: https://www.docker.com\n\n`
    );
  }
};

const checkVmRunner = async () => {
  const {
    log,
    options: { vmType },
  } = getRuntimeServices();

  // Determine the VM type to check: explicit vmType > CI default (vagrant) > multipass
  const resolvedVmType: SupportedVmManager = vmType || (process.env.CI ? 'vagrant' : 'multipass');

  if (resolvedVmType === 'multipass') {
    try {
      const version = await execa('multipass', ['--version']);

      log.verbose(`Using 'multipass': ${version.stdout}`);
    } catch (err) {
      log.verbose(err);
      throw new Error(
        `Multipass not found on local machine [${err.message}]. Install it from: https://multipass.run\n\n`
      );
    }
  } else if (resolvedVmType === 'orbstack') {
    try {
      const version = await execa('orb', ['version']);

      log.verbose(`Using 'orbstack': ${version.stdout}`);
    } catch (err) {
      log.verbose(err);
      throw new Error(
        `OrbStack not found on local machine [${err.message}]. Install it from: https://orbstack.dev\n\n`
      );
    }
  } else if (resolvedVmType === 'vagrant') {
    try {
      const version = await execa('vagrant', ['--version']);

      log.verbose(`Using 'vagrant': ${version.stdout}`);
    } catch (err) {
      log.verbose(err);
      throw new Error(
        `Vagrant not found on local machine [${err.message}]. Install it from: https://www.vagrantup.com\n\n`
      );
    }
  }
};
