/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. and/or licensed to Elasticsearch B.V.
 * under one or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { runEnableRemoteAccess } from './runner';

const runCli: RunFn = async (cliContext) => {
  createToolingLogger.setDefaultLogLevelFromCliFlags(cliContext.flags);

  await runEnableRemoteAccess({
    multipassNameFilter: cliContext.flags.multipassNameFilter as string,
    enableRdp: cliContext.flags.rdp !== false,
    enableSshPasswordAuth: Boolean(cliContext.flags.enableSshPasswordAuth),
    setUbuntuPassword: Boolean(cliContext.flags.setUbuntuPassword),
    ubuntuPassword: cliContext.flags.ubuntuPassword as string,
    log: cliContext.log,
  });
};

export const cli = () => {
  run(runCli, {
    description: `
  Enables remote access on Multipass instances for demo purposes:
  - RDP via xrdp + xfce4 (port 3389)
  - Optional: enable SSH password auth
  - Optional: set/reset ubuntu user's password
`,
    flags: {
      boolean: ['rdp', 'enableSshPasswordAuth', 'setUbuntuPassword'],
      string: ['multipassNameFilter', 'ubuntuPassword'],
      default: {
        rdp: true,
        enableSshPasswordAuth: false,
        setUbuntuPassword: false,
        ubuntuPassword: '',
        multipassNameFilter: '',
      },
      help: `
        --rdp                  Optional. Install/enable xrdp + xfce4 (default: true)
        --setUbuntuPassword     Optional. If set, resets ubuntu password to --ubuntuPassword (default: false)
        --ubuntuPassword        Optional. Password value to set when --setUbuntuPassword is used
        --enableSshPasswordAuth Optional. If set, enables PasswordAuthentication for sshd (default: false)
        --multipassNameFilter   Optional. Regex string; only update matching multipass instance names
      `,
    },
  });
};
