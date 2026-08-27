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
import type { CreateExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_ARTIFACT_LISTS,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import { randomPolicyIdGenerator } from '../common/random_policy_id_generator';
import { ExceptionsListItemGenerator } from '../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { isArtifactByPolicy } from '../../../common/endpoint/service/artifacts';

export const cli = () => {
  run(
    async (options) => {
      try {
        await createCustomYaraSignatures(options);
        options.log.success(`${options.flags.count} endpoint custom YARA signatures created`);
      } catch (e) {
        options.log.error(e);
        throw createFailError(e.message);
      }
    },
    {
      description: 'Load Endpoint Custom YARA Signatures',
      flags: {
        string: ['kibana'],
        default: {
          count: 10,
          kibana: 'http://elastic:changeme@127.0.0.1:5601',
        },
        help: `
        --count            Number of custom YARA signatures to create. Default: 10
        --kibana           The URL to kibana including credentials. Default: http://elastic:changeme@127.0.0.1:5601
      `,
      },
    }
  );
};

class CustomYaraSignatureDataLoaderError extends Error {
  constructor(message: string, public readonly meta: unknown) {
    super(message);
  }
}

const handleThrowHttpError = (err: Error): never => {
  throw new CustomYaraSignatureDataLoaderError(err.message, err);
};

const createCustomYaraSignatures: RunFn = async ({ flags, log }) => {
  const generator = new ExceptionsListItemGenerator();
  const kbn = new KbnClient({ log, url: flags.kibana as string });

  await ensureCreateEndpointCustomYaraSignaturesList(kbn);

  const randomPolicyId = await randomPolicyIdGenerator(kbn, log);

  await pMap(
    Array.from({ length: flags.count as unknown as number }),
    () => {
      const body = generator.generateCustomYaraSignatureForCreate();

      if (isArtifactByPolicy(body)) {
        const nmExceptions = generator.randomN(3) || 1;
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

const ensureCreateEndpointCustomYaraSignaturesList = async (kbn: KbnClient) => {
  const newListDefinition: CreateExceptionListSchema = {
    description: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.description,
    list_id: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id,
    meta: undefined,
    name: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.name,
    os_types: [],
    tags: [],
    type: ExceptionListTypeEnum.ENDPOINT_CUSTOM_YARA_SIGNATURES,
    namespace_type: 'agnostic',
  };

  await kbn
    .request({
      method: 'POST',
      path: EXCEPTION_LIST_URL,
      body: newListDefinition,
    })
    .catch((e) => {
      // Ignore if list was already created
      if (e.status !== 409) {
        handleThrowHttpError(e);
      }
    });
};
