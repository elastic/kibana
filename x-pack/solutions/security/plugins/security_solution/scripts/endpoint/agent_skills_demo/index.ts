/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { runAgentSkillsDemo } from './runner';

const runDemo: RunFn = async (cliContext) => {
  createToolingLogger.setDefaultLogLevelFromCliFlags(cliContext.flags);

  await runAgentSkillsDemo({
    kibanaUrl: cliContext.flags.kibanaUrl as string,
    elasticUrl: cliContext.flags.elasticUrl as string,
    fleetServerUrl: cliContext.flags.fleetServerUrl as string,
    username: cliContext.flags.username as string,
    password: cliContext.flags.password as string,
    apiKey: cliContext.flags.apiKey as string,
    spaceId: cliContext.flags.spaceId as string,
    version: cliContext.flags.version as string,
    policy: cliContext.flags.policy as string,
    scenario: cliContext.flags.scenario as string,
    cleanup: Boolean(cliContext.flags.cleanup),
    runPlaywrightUi: Boolean(cliContext.flags.runPlaywrightUi),
    showBrowser: Boolean(cliContext.flags.showBrowser),
    multipassImage: cliContext.flags.multipassImage as string,
    teardownVm: cliContext.flags.teardownVm as string,
    log: cliContext.log,
  });
};

export const cli = () => {
  run(runDemo, {
    description: `
  Sets up a complete Agent Skills demo environment:
  - starts Fleet Server (docker) if needed
  - provisions an Ubuntu VM using multipass
  - installs Elastic Agent and enrolls it with Fleet
  - ensures Elastic Defend + Osquery integrations are installed on the policy
  - optionally runs a demo scenario and validates the setup
`,
    flags: {
      string: [
        'kibanaUrl',
        'elasticUrl',
        'fleetServerUrl',
        'username',
        'password',
        'apiKey',
        'spaceId',
        'version',
        'policy',
        'scenario',
        'teardownVm',
        'multipassImage',
      ],
      boolean: ['cleanup', 'runPlaywrightUi', 'showBrowser'],
      default: {
        kibanaUrl: 'http://127.0.0.1:5601',
        elasticUrl: 'http://127.0.0.1:9200',
        username: 'elastic',
        password: 'changeme',
        apiKey: '',
        version: '',
        policy: '',
        spaceId: '',
        scenario: 'default',
        cleanup: false,
        teardownVm: '',
        runPlaywrightUi: false,
        showBrowser: false,
        multipassImage: 'lts',
      },
      help: `
        --teardownVm         Optional. If provided, deletes this multipass VM and exits (no stack interaction).
        --runPlaywrightUi    Optional. If set, runs a Playwright UI flow after setup (Fleet → Agent details)
        --showBrowser        Optional. If set, runs Playwright in headful mode and keeps the browser open
        --scenario          Optional. Demo scenario id. Default: default
        --cleanup           Optional. Cleanup the created VM after the demo completes
        --version           Optional. The version of the Agent to use for enrolling the new host.
                            Default: uses the same version as the stack (kibana).
        --policy            Optional. An Agent Policy ID to use when enrolling the new Host
                            running Elastic Agent. If omitted, a default policy is created.
        --username          Optional. User name to be used for auth against elasticsearch and
                            kibana (Default: elastic).
        --password          Optional. Password associated with the username (Default: changeme)
        --apiKey            Optional. A Kibana API key to use for authz. When defined, 'username'
                            and 'password' arguments are ignored.
        --spaceId           Optional. The space id where the demo should be configured.
        --kibanaUrl         Optional. The url to Kibana (Default: http://127.0.0.1:5601)
        --elasticUrl        Optional. The url to Elasticsearch (Default: http://127.0.0.1:9200)
        --fleetServerUrl    Optional. The url to Fleet Server (Default: managed by the script)
        --multipassImage    Optional. Multipass image to use for new VMs (default: lts).
      `,
    },
  });
};
