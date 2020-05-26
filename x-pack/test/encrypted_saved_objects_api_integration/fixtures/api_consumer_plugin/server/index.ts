/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, PluginInitializer } from '../../../../../../src/core/server';
import { deepFreeze } from '../../../../../../src/core/utils';
import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '../../../../../plugins/encrypted_saved_objects/server';
import { SpacesPluginSetup } from '../../../../../plugins/spaces/server';

const SAVED_OBJECT_WITH_SECRET_TYPE = 'saved-object-with-secret';

interface PluginsSetup {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  spaces: SpacesPluginSetup;
}

interface PluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  spaces: never;
}

export const plugin: PluginInitializer<void, void, PluginsSetup, PluginsStart> = () => ({
  setup(core: CoreSetup<PluginsStart>, deps) {
    core.savedObjects.registerType({
      name: SAVED_OBJECT_WITH_SECRET_TYPE,
      hidden: false,
      namespaceAgnostic: false,
      mappings: deepFreeze({
        properties: {
          publicProperty: { type: 'keyword' },
          publicPropertyExcludedFromAAD: { type: 'keyword' },
          privateProperty: { type: 'binary' },
        },
      }),
    });

    deps.encryptedSavedObjects.registerType({
      type: SAVED_OBJECT_WITH_SECRET_TYPE,
      attributesToEncrypt: new Set(['privateProperty']),
      attributesToExcludeFromAAD: new Set(['publicPropertyExcludedFromAAD']),
    });

    core.http.createRouter().get(
      {
        path: '/api/saved_objects/get-decrypted-as-internal-user/{id}',
        validate: { params: (value) => ({ value }) },
      },
      async (context, request, response) => {
        const [, { encryptedSavedObjects }] = await core.getStartServices();
        const spaceId = deps.spaces.spacesService.getSpaceId(request);
        const namespace = deps.spaces.spacesService.spaceIdToNamespace(spaceId);

        try {
          return response.ok({
            body: await encryptedSavedObjects.getDecryptedAsInternalUser(
              SAVED_OBJECT_WITH_SECRET_TYPE,
              request.params.id,
              { namespace }
            ),
          });
        } catch (err) {
          if (encryptedSavedObjects.isEncryptionError(err)) {
            return response.badRequest({ body: 'Failed to encrypt attributes' });
          }

          return response.customError({ body: err, statusCode: 500 });
        }
      }
    );
  },
  start() {},
  stop() {},
});
