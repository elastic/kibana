/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHostVmClient } from '../../../../scripts/endpoint/common/vm_services';

/**
 * Starts a long-lived `sleep` on the enrolled VM.
 *
 * CI uses `vagrant ssh -- <command>`, which forwards extra args to the SSH
 * client. Short flags such as `-t` or `-c` are eaten there (exit 255) and never
 * run on the guest. `systemd-run` returns immediately; a bare `sleep` would
 * block `exec` for the whole interval.
 *
 * `seconds` controls how long the process stays alive. Callers tell sleeps apart
 * by the new PID, because the processes action reports the executable path with
 * no arguments. Do not add short flags to the command.
 */
export const startLongRunningSleep = async (hostname: string, seconds = 600): Promise<void> => {
  if (!Number.isInteger(seconds) || seconds < 1) {
    throw new Error(`sleep duration must be a positive integer, received ${seconds}`);
  }

  await getHostVmClient(hostname).exec(`sudo systemd-run sleep ${seconds}`);
};
