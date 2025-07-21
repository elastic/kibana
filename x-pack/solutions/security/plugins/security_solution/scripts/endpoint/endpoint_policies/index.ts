/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { indexFleetEndpointPolicy } from '../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { setupFleetForEndpoint } from '../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import { BaseDataGenerator } from '../../../common/endpoint/data_generators/base_data_generator';
import { getEndpointPackageInfo } from '../../../common/endpoint/utils/package';
import { createKbnClient } from '../common/stack_services';

class EndpointPolicyGenerator extends BaseDataGenerator {
  private counter = 1;

  public policyName(preFix: string | number = '') {
    return `${preFix}${preFix ? ' ' : ''}${this.randomString(5)}-${this.counter++} Endpoint Policy`;
  }
}

const generate = new EndpointPolicyGenerator();

export const cli = async () => {
  await run(
    async ({ log, flags }) => {
      const kbn = createKbnClient({
        url: flags.kibana as string,
        username: flags.username as string,
        password: flags.password as string,
        apiKey: flags.apikey as string,
        spaceId: flags.spaceId as string,
        log,
      });
      const max = Number(flags.count);
      const maxErrors = 10; // Max errors encountered until the script exits
      const errors: string[] = [];
      let created = 0;

      log.info(
        `Creating ${flags.count} endpoint policies${
          flags.apiKey ? ` in space ${flags.spaceId}` : ''
        }...`
      );

      try {
        await setupFleetForEndpoint(kbn, log);
        const endpointPackage = await getEndpointPackageInfo(kbn);

        while (created < max) {
          await indexFleetEndpointPolicy(
            kbn,
            generate.policyName(created),
            endpointPackage.version
          );
          created++;
        }
      } catch (error) {
        error.push(error.message);

        if (errors.length >= maxErrors) {
          log.error(
            `${errors.length} errors were encountered: ${JSON.stringify(errors, null, 2)}\n`
          );
          throw createFailError(
            `Too many errors encountered (${errors.length}. Only ${created} policies were created`
          );
        }
      }

      log.success(`Done!`);
    },
    {
      description: 'Load Endpoint Policies into Fleet (also creates associated Agent Policies)',
      flags: {
        string: ['kibana', 'username', 'password', 'spaceId'],
        default: {
          count: 15,
          spaceId: '',
          kibana: 'http://127.0.0.1:5601',
          username: 'elastic',
          password: 'changeme',
          apikey: undefined,
        },
        help: `
        --count            Number of Endpoint Policies to create. Default: 15
        --spaceId          The space ID where policies will be created. Used the 'default' space by default
        --kibana           The URL to kibana including credentials. Default: http://127.0.0.1:5601
        --username         The username to use for authentication for local or cloud environment. Default: elastic
        --password         The password to use for authentication for local or cloud environment. Default: changeme
        --apikey           API key for authenticating for Serverless environment.
      `,
      },
    }
  );
};
