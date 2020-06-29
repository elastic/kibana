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
  SavedObjectUnsanitizedDoc,
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

const SAVED_OBJECT_WITH_MIGRATION_TYPE = 'saved-object-with-migration';
interface MigratedTypePre790 {
  nonEncryptedAttribute: string;
  encryptedAttribute: string;
}
interface MigratedType {
  nonEncryptedAttribute: string;
  encryptedAttribute: string;
  additionalEncryptedAttribute: string;
}

export interface PluginsSetup {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  spaces: SpacesPluginSetup;
}

export interface PluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  spaces: never;
}

export const plugin: PluginInitializer<void, void, PluginsSetup, PluginsStart> = () => ({
  setup(core: CoreSetup<PluginsStart>, deps: PluginsSetup) {
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

    defineTypeWithMigration(core, deps);

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

function defineTypeWithMigration(core: CoreSetup<PluginsStart>, deps: PluginsSetup) {
  const typePriorTo790 = {
    type: SAVED_OBJECT_WITH_MIGRATION_TYPE,
    attributesToEncrypt: new Set(['encryptedAttribute']),
  };

  // current type is registered
  deps.encryptedSavedObjects.registerType({
    type: SAVED_OBJECT_WITH_MIGRATION_TYPE,
    attributesToEncrypt: new Set(['encryptedAttribute', 'additionalEncryptedAttribute']),
  });

  core.savedObjects.registerType({
    name: SAVED_OBJECT_WITH_MIGRATION_TYPE,
    hidden: false,
    namespaceType: 'single',
    mappings: {
      properties: {
        nonEncryptedAttribute: {
          type: 'keyword',
        },
        encryptedAttribute: {
          type: 'binary',
        },
        additionalEncryptedAttribute: {
          type: 'keyword',
        },
      },
    },
    migrations: {
      // in this version we migrated a non encrypted field and type didnt change
      '7.8.0': deps.encryptedSavedObjects.createMigration<MigratedTypePre790, MigratedTypePre790>(
        function shouldBeMigrated(doc): doc is SavedObjectUnsanitizedDoc<MigratedTypePre790> {
          return true;
        },
        (
          doc: SavedObjectUnsanitizedDoc<MigratedTypePre790>
        ): SavedObjectUnsanitizedDoc<MigratedTypePre790> => {
          const {
            attributes: { nonEncryptedAttribute },
          } = doc;
          return {
            ...doc,
            attributes: {
              ...doc.attributes,
              nonEncryptedAttribute: `${nonEncryptedAttribute}-migrated`,
            },
          };
        },
        // type hasn't changed as the field we're updating is not an encrypted one
        typePriorTo790,
        typePriorTo790
      ),
      // in this version we encrypted an existing non encrypted field
      '7.9.0': deps.encryptedSavedObjects.createMigration<MigratedTypePre790, MigratedType>(
        function shouldBeMigrated(doc): doc is SavedObjectUnsanitizedDoc<MigratedTypePre790> {
          return true;
        },
        (
          doc: SavedObjectUnsanitizedDoc<MigratedTypePre790>
        ): SavedObjectUnsanitizedDoc<MigratedType> => {
          const {
            attributes: { nonEncryptedAttribute },
          } = doc;
          return {
            ...doc,
            attributes: {
              ...doc.attributes,
              nonEncryptedAttribute,
              // clone and modify the non encrypted field
              additionalEncryptedAttribute: `${nonEncryptedAttribute}-encrypted`,
            },
          };
        },
        typePriorTo790
      ),
    },
  });
}
