/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createHash } from 'crypto';
import { schema } from '@kbn/config-schema';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ExternalReferenceAttachmentType,
  PersistableStateAttachmentTypeSetup,
} from '@kbn/cases-plugin/server/attachment_framework/types';
import { BulkCreateCasesRequest, CasesPatchRequest } from '@kbn/cases-plugin/common/types/api';
import type { FixtureStartDeps } from './plugin';

const hashParts = (parts: string[]): string => {
  const hash = createHash('sha1');
  const hashFeed = parts.join('-');
  return hash.update(hashFeed).digest('hex');
};

const getExternalReferenceAttachmentTypeHash = (type: ExternalReferenceAttachmentType) => {
  return hashParts([type.id]);
};

const getPersistableStateAttachmentTypeHash = (type: PersistableStateAttachmentTypeSetup) => {
  return hashParts([type.id]);
};

export const registerRoutes = (core: CoreSetup<FixtureStartDeps>, logger: Logger) => {
  const router = core.http.createRouter();
  /**
   * This simply wraps the cases patch case api so that we can test updating the status of an alert using
   * the cases client interface instead of going through the case plugin's RESTful interface
   */
  router.patch(
    {
      path: '/api/cases_user/cases',
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      try {
        const [_, { cases }] = await core.getStartServices();
        const client = await cases.getCasesClientWithRequest(request);

        return response.ok({
          body: await client.cases.update(request.body as CasesPatchRequest),
        });
      } catch (error) {
        logger.error(`CasesClientUser failure: ${error}`);
        throw error;
      }
    }
  );

  router.get(
    { path: '/api/cases_fixture/registered_external_reference_attachments', validate: {} },
    async (context, request, response) => {
      try {
        const [_, { cases }] = await core.getStartServices();
        const externalReferenceAttachmentTypeRegistry =
          cases.getExternalReferenceAttachmentTypeRegistry();

        const allTypes = externalReferenceAttachmentTypeRegistry.list();

        const hashMap = allTypes.reduce((map, type) => {
          map[type.id] = getExternalReferenceAttachmentTypeHash(type);
          return map;
        }, {} as Record<string, string>);

        return response.ok({
          body: hashMap,
        });
      } catch (error) {
        logger.error(`Error : ${error}`);
        throw error;
      }
    }
  );

  router.get(
    { path: '/api/cases_fixture/registered_persistable_state_attachments', validate: {} },
    async (context, request, response) => {
      try {
        const [_, { cases }] = await core.getStartServices();
        const persistableStateAttachmentTypeRegistry =
          cases.getPersistableStateAttachmentTypeRegistry();

        const allTypes = persistableStateAttachmentTypeRegistry.list();

        const hashMap = allTypes.reduce((map, type) => {
          map[type.id] = getPersistableStateAttachmentTypeHash(type);
          return map;
        }, {} as Record<string, string>);

        return response.ok({
          body: hashMap,
        });
      } catch (error) {
        logger.error(`Error : ${error}`);
        throw error;
      }
    }
  );

  router.post(
    {
      path: '/api/cases_fixture/cases:bulkCreate',
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      try {
        const [_, { cases }] = await core.getStartServices();
        const client = await cases.getCasesClientWithRequest(request);

        return response.ok({
          body: await client.cases.bulkCreate(request.body as BulkCreateCasesRequest),
        });
      } catch (error) {
        logger.error(`Error : ${error}`);

        const boom = new Boom.Boom(error.message, {
          statusCode: error.wrappedError.output.statusCode,
        });

        return response.customError({
          body: boom,
          headers: boom.output.headers as { [key: string]: string },
          statusCode: boom.output.statusCode,
        });
      }
    }
  );
};
