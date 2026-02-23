/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { runInstallBrowsers } from './runner';

const runCli: RunFn = async (cliContext) => {
  createToolingLogger.setDefaultLogLevelFromCliFlags(cliContext.flags);

  await runInstallBrowsers({
    installFirefox: cliContext.flags.firefox !== false,
    installChrome: cliContext.flags.chrome !== false,
    multipassNameFilter: cliContext.flags.multipassNameFilter as string,
    log: cliContext.log,
  });
};

export const cli = () => {
  run(runCli, {
    description: `
  Installs browsers on Multipass instances.

  Notes:
  - On arm64 VMs (e.g. Apple Silicon multipass), Google Chrome is not available; this installs Chromium instead.
  - Firefox is installed via snap (or apt transitional package) depending on distro setup.
`,
    flags: {
      boolean: ['firefox', 'chrome'],
      string: ['multipassNameFilter'],
      default: {
        firefox: true,
        chrome: true,
        multipassNameFilter: '',
      },
      help: `
        --firefox             Optional. Install Firefox (default: true)
        --chrome              Optional. Install Chrome (amd64) or Chromium (arm64) (default: true)
        --multipassNameFilter Optional. Regex string; only update matching multipass instance names
      `,
    },
  });
};


