/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
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
  const { log } = getRuntimeServices();

  try {
    const version = await execa('multipass', ['--version']);

    log.verbose(`Using 'multipass': ${version.stdout}`);
    // Ensure the daemon/socket is reachable (multipass CLI may exist but service may be stopped).
    await execa('multipass', ['list']);
  } catch (err) {
    log.verbose(err);
    throw new Error(
      `Multipass is not usable on this machine right now.\n\n` +
      `Common causes:\n` +
      `- Multipass is not installed (install from: https://multipass.run)\n` +
      `- Multipass is installed but the daemon/socket is not running (e.g. 'cannot connect to the multipass socket')\n\n` +
      `Original error: ${err.message}\n`
    );
  }
};
