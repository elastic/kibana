/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  deepFreeze,
  CoreSetup,
  PluginInitializer,
  SavedObjectsNamespaceType,
} from '../../../../../../src/core/server';
import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '../../../../../plugins/encrypted_saved_objects/server';
import { SpacesPluginSetup } from '../../../../../plugins/spaces/server';
import { registerHiddenSORoutes } from './hidden_saved_object_routes';

const SAVED_OBJECT_WITH_SECRET_TYPE = 'saved-object-with-secret';
const HIDDEN_SAVED_OBJECT_WITH_SECRET_TYPE = 'hidden-saved-object-with-secret';
const SAVED_OBJECT_WITH_SECRET_AND_MULTIPLE_SPACES_TYPE =
  'saved-object-with-secret-and-multiple-spaces';
const SAVED_OBJECT_WITHOUT_SECRET_TYPE = 'saved-object-without-secret';

export interface PluginsSetup {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  spaces: SpacesPluginSetup;
}

export interface PluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  spaces: never;
}

export const plugin: PluginInitializer<void, void, PluginsSetup, PluginsStart> = () => ({
  setup(core: CoreSetup<PluginsStart>, deps) {
    for (const [name, namespaceType, hidden] of [
      [SAVED_OBJECT_WITH_SECRET_TYPE, 'single', false],
      [HIDDEN_SAVED_OBJECT_WITH_SECRET_TYPE, 'single', true],
      [SAVED_OBJECT_WITH_SECRET_AND_MULTIPLE_SPACES_TYPE, 'multiple', false],
    ] as Array<[string, SavedObjectsNamespaceType, boolean]>) {
      core.savedObjects.registerType({
        name,
        hidden,
        namespaceType,
        mappings: deepFreeze({
          properties: {
            publicProperty: { type: 'keyword' },
            publicPropertyExcludedFromAAD: { type: 'keyword' },
            publicPropertyStoredEncrypted: { type: 'binary' },
            privateProperty: { type: 'binary' },
          },
        }),
      });

      deps.encryptedSavedObjects.registerType({
        type: name,
        attributesToEncrypt: new Set([
          'privateProperty',
          { key: 'publicPropertyStoredEncrypted', dangerouslyExposeValue: true },
        ]),
        attributesToExcludeFromAAD: new Set(['publicPropertyExcludedFromAAD']),
      });
    }

    core.savedObjects.registerType({
      name: SAVED_OBJECT_WITHOUT_SECRET_TYPE,
      hidden: false,
      namespaceType: 'single',
      mappings: deepFreeze({ properties: { publicProperty: { type: 'keyword' } } }),
    });

    const router = core.http.createRouter();
    router.get(
      {
        path: '/api/saved_objects/get-decrypted-as-internal-user/{type}/{id}',
        validate: { params: (value) => ({ value }) },
      },
      async (context, request, response) => {
        const [, { encryptedSavedObjects }] = await core.getStartServices();
        const spaceId = deps.spaces.spacesService.getSpaceId(request);
        const namespace = deps.spaces.spacesService.spaceIdToNamespace(spaceId);

        try {
          return response.ok({
            body: await encryptedSavedObjects
              .getClient()
              .getDecryptedAsInternalUser(request.params.type, request.params.id, { namespace }),
          });
        } catch (err) {
          if (encryptedSavedObjects.isEncryptionError(err)) {
            return response.badRequest({ body: 'Failed to encrypt attributes' });
          }

          return response.customError({ body: err, statusCode: 500 });
        }
      }
    );

    registerHiddenSORoutes(router, core, deps, [HIDDEN_SAVED_OBJECT_WITH_SECRET_TYPE]);
  },
  start() {},
  stop() {},
});
