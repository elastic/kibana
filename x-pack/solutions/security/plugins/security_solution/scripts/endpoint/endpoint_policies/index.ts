/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { KbnClient } from '@kbn/test';
import { indexFleetEndpointPolicy } from '../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { setupFleetForEndpoint } from '../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import { BaseDataGenerator } from '../../../common/endpoint/data_generators/base_data_generator';
import { getEndpointPackageInfo } from '../../../common/endpoint/utils/package';

class EndpointPolicyGenerator extends BaseDataGenerator {
  private counter = 1;

  public policyName(preFix: string | number = '') {
    return `${preFix}${preFix ? ' ' : ''}${this.randomString(5)}-${this.counter++} Endpoint Policy`;
  }
}

const generate = new EndpointPolicyGenerator();

export const cli = async () => {
  await run(
    async ({ log, flags: { kibana, count } }) => {
      const kbn = new KbnClient({ log, url: kibana as string });
      const max = Number(count);
      const maxErrors = 10; // Max errors encountered until the script exits
      const errors: string[] = [];
      let created = 0;

      log.info(`Creating ${count} endpoint policies...`);

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
      description: 'Load Endpoint Policies into fleet (also creates associated Agent Policies)',
      flags: {
        string: ['kibana'],
        default: {
          count: 15,
          kibana: 'http://elastic:changeme@127.0.0.1:5601',
        },
        help: `
        --count            Number of Endpoint Policies to create. Default: 15
        --kibana           The URL to kibana including credentials. Default: http://elastic:changeme@127.0.0.1:5601
      `,
      },
    }
  );
};
