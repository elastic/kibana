/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  Plugin,
  CoreSetup,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  PluginInitializerContext,
} from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { upgradeBuiltInEntityDefinitions } from '@kbn/entityManager-plugin/server/lib/entities/upgrade_entity_definition';
import { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { entityDefinitionSchema } from '@kbn/entities-schema';

interface FixtureStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security: SecurityPluginStart;
}

export class FixturePlugin implements Plugin<void, void, {}, FixtureStartDeps> {
  private logger: Logger;

  constructor(context: PluginInitializerContext<{}>) {
    this.logger = context.logger.get();
  }

  public setup(core: CoreSetup<FixtureStartDeps>) {
    core.http.createRouter().post(
      {
        path: '/api/entities/upgrade_builtin_definitions',
        validate: {
          body: buildRouteValidationWithZod(
            z.object({
              definitions: z.array(entityDefinitionSchema),
            })
          ),
        },
      },
      async (
        context: RequestHandlerContext,
        req: KibanaRequest<any, any, any, any>,
        res: KibanaResponseFactory
      ) => {
        const [coreStart, { encryptedSavedObjects, security }] = await core.getStartServices();

        const result = await upgradeBuiltInEntityDefinitions({
          definitions: req.body.definitions,
          server: {
            encryptedSavedObjects,
            security,
            core: coreStart,
            logger: this.logger,
            config: {},
            isServerless: false,
          },
        });

        return res.ok({ body: result });
      }
    );
  }

  public start() {}
  public stop() {}
}
