/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import { ToolingLog } from '@kbn/tooling-log';
import { enrollEndpointHost } from '@kbn/security-solution-plugin/scripts/endpoint/endpoint_agent_runner/elastic_endpoint';
import { Manager } from './resource_manager';

export class AgentManager extends Manager {
  private log: ToolingLog;
  private vmName?: string;
  constructor(log: ToolingLog) {
    super();
    this.log = log;
    this.vmName = undefined;
  }

  public async setup() {
    this.vmName = await enrollEndpointHost();

    return this.vmName;
  }

  public cleanup() {
    super.cleanup();
    this.log.info('Cleaning up the agent process');
    if (this.vmName) {
      execa.commandSync(`multipass delete -p ${this.vmName}`);

      this.log.info('Agent process closed');
    }
  }
}
