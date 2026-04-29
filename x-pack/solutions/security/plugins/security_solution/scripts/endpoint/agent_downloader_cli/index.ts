/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { agentDownloaderRunner } from './agent_downloader';

export const cli = () => {
  run(
    agentDownloaderRunner,

    // Options
    {
      description: `Elastic Agent downloader`,
      flags: {
        string: ['version'],
        boolean: ['closestMatch'],
        default: {
          closestMatch: true,
        },
        help: `
        --version          Required. Elastic agent version to be downloaded.
        --closestMatch     Optional. Use closest elastic agent version to match with.
      `,
      },
    }
  );
};
