/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { runEnableBrowsersForUbuntu } from './runner';

const runCli: RunFn = async (cliContext) => {
  createToolingLogger.setDefaultLogLevelFromCliFlags(cliContext.flags);

  await runEnableBrowsersForUbuntu({
    multipassNameFilter: cliContext.flags.multipassNameFilter as string,
    log: cliContext.log,
  });
};

export const cli = () => {
  run(runCli, {
    description: `
  Ensures browsers installed via snap/apt are usable for the 'ubuntu' user in GUI sessions.
  - ensures /snap/bin is in the global profile PATH
  - adds Desktop launchers for firefox/chromium if present
`,
    flags: {
      string: ['multipassNameFilter'],
      default: {
        multipassNameFilter: '',
      },
      help: `
        --multipassNameFilter  Optional. Regex string; only update matching multipass instance names
      `,
    },
  });
};


