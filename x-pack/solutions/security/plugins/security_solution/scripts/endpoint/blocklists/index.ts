/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { KbnClient } from '@kbn/test';
import pMap from 'p-map';
import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { randomPolicyIdGenerator } from '../common/random_policy_id_generator';
import { ExceptionsListItemGenerator } from '../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { isArtifactByPolicy } from '../../../common/endpoint/service/artifacts';
import { ensureArtifactListExists } from '../common/endpoint_artifact_services';

export const cli = () => {
  run(
    async (options) => {
      try {
        await createBlocklists(options);
        options.log.success(`${options.flags.count} endpoint blocklists created`);
      } catch (e) {
        options.log.error(e);
        throw createFailError(e.message);
      }
    },
    {
      description: 'Load Endpoint Blocklists',
      flags: {
        string: ['kibana'],
        default: {
          count: 10,
          kibana: 'http://elastic:changeme@127.0.0.1:5601',
        },
        help: `
        --count            Number of blocklists to create. Default: 10
        --kibana           The URL to kibana including credentials. Default: http://elastic:changeme@127.0.0.1:5601
      `,
      },
    }
  );
};

class BlocklistDataLoaderError extends Error {
  constructor(message: string, public readonly meta: unknown) {
    super(message);
  }
}

const handleThrowHttpError = (err: Error): never => {
  throw new BlocklistDataLoaderError(err.message, err);
};

const createBlocklists: RunFn = async ({ flags, log }) => {
  const eventGenerator = new ExceptionsListItemGenerator();
  const kbn = new KbnClient({ log, url: flags.kibana as string });

  await ensureArtifactListExists(kbn, 'blocklists');

  const randomPolicyId = await randomPolicyIdGenerator(kbn, log);

  await pMap(
    Array.from({ length: flags.count as unknown as number }),
    () => {
      const body = eventGenerator.generateBlocklistForCreate();

      if (isArtifactByPolicy(body)) {
        const nmExceptions = eventGenerator.randomN(3) || 1;
        body.tags = Array.from({ length: nmExceptions }, () => {
          return `policy:${randomPolicyId()}`;
        });
      }
      return kbn
        .request({
          method: 'POST',
          path: EXCEPTION_LIST_ITEM_URL,
          body,
        })
        .catch((e) => handleThrowHttpError(e));
    },
    { concurrency: 10 }
  );
};
