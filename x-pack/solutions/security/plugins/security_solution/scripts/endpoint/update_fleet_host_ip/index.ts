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
import { runUpdateFleetHostIp } from './runner';

const runCli: RunFn = async (cliContext) => {
  createToolingLogger.setDefaultLogLevelFromCliFlags(cliContext.flags);

  await runUpdateFleetHostIp({
    kibanaUrl: cliContext.flags.kibanaUrl as string,
    elasticUrl: cliContext.flags.elasticUrl as string,
    username: cliContext.flags.username as string,
    password: cliContext.flags.password as string,
    apiKey: cliContext.flags.apiKey as string,
    spaceId: cliContext.flags.spaceId as string,
    hostIp: cliContext.flags.hostIp as string,
    fleetServerPort: Number(cliContext.flags.fleetServerPort ?? 8220),
    restartFleetServer: Boolean(cliContext.flags.restartFleetServer),
    updateMultipassAgents: Boolean(cliContext.flags.updateMultipassAgents),
    multipassNameFilter: cliContext.flags.multipassNameFilter as string,
    log: cliContext.log,
  });
};

export const cli = () => {
  run(runCli, {
    description: `
  Updates Fleet settings so VMs/containers can reach the stack using a specific host LAN IP:
  - updates Fleet Server host URLs
  - updates Fleet Elasticsearch Output hosts
  - optionally restarts the Fleet Server Docker container
  - optionally re-enrolls Elastic Agent inside all Multipass VMs to pick up the new Fleet Server URL
`,
    flags: {
      string: [
        'kibanaUrl',
        'elasticUrl',
        'username',
        'password',
        'apiKey',
        'spaceId',
        'hostIp',
        'multipassNameFilter',
      ],
      number: ['fleetServerPort'],
      boolean: ['restartFleetServer', 'updateMultipassAgents'],
      default: {
        kibanaUrl: 'http://127.0.0.1:5601',
        elasticUrl: 'http://127.0.0.1:9200',
        username: 'elastic',
        password: 'changeme',
        apiKey: '',
        spaceId: '',
        hostIp: '',
        fleetServerPort: 8220,
        restartFleetServer: true,
        updateMultipassAgents: true,
        multipassNameFilter: '',
      },
      help: `
        --hostIp               Required. Host LAN IP reachable from multipass VMs (ex: 192.168.3.247)
        --fleetServerPort      Optional. Fleet Server port (default: 8220)
        --restartFleetServer   Optional. Restart Fleet Server docker container (default: true)
        --updateMultipassAgents Optional. Re-enroll/restart Elastic Agent in all multipass VMs (default: true)
        --multipassNameFilter  Optional. Regex string; only update matching multipass instance names
        --kibanaUrl            Optional. The url to Kibana (Default: http://127.0.0.1:5601)
        --elasticUrl           Optional. The url to Elasticsearch (Default: http://127.0.0.1:9200)
        --username             Optional. Kibana username (Default: elastic)
        --password             Optional. Kibana password (Default: changeme)
        --apiKey               Optional. Kibana API key (when set, username/password are ignored)
        --spaceId              Optional. Kibana space id
      `,
    },
  });
};
