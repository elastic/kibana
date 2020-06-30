/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Plugin,
  CoreSetup,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
} from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { EncryptedSavedObjectsPluginStart } from '../../../../../../../plugins/encrypted_saved_objects/server';
import { SpacesPluginSetup } from '../../../../../../../plugins/spaces/server';

interface FixtureSetupDeps {
  spaces?: SpacesPluginSetup;
}
interface FixtureStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  public setup(core: CoreSetup<FixtureStartDeps>, { spaces }: FixtureSetupDeps) {
    core.http.createRouter().post(
      {
        path: '/api/check_aad',
        validate: {
          body: schema.object({
            spaceId: schema.maybe(schema.string()),
            type: schema.string(),
            id: schema.string(),
          }),
        },
      },
      async function (
        context: RequestHandlerContext,
        req: KibanaRequest<any, any, any, any>,
        res: KibanaResponseFactory
      ): Promise<IKibanaResponse<any>> {
        try {
          let namespace: string | undefined;
          if (spaces && req.body.spaceId) {
            namespace = spaces.spacesService.spaceIdToNamespace(req.body.spaceId);
          }
          const [, { encryptedSavedObjects }] = await core.getStartServices();
          await encryptedSavedObjects
            .getClient({
              includedHiddenTypes: ['alert', 'action'],
            })
            .getDecryptedAsInternalUser(req.body.type, req.body.id, {
              namespace,
            });
          return res.ok({ body: { success: true } });
        } catch (err) {
          return res.internalError({ body: err });
        }
      }
    );
  }

  public start() {}
  public stop() {}
}
