/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { boomify, badRequest } from 'boom';
import { Legacy } from 'kibana';
import {
  PluginSetupContract,
  PluginStartContract,
} from '../../../../plugins/encrypted_saved_objects/server';

const SAVED_OBJECT_WITH_SECRET_TYPE = 'saved-object-with-secret';

// eslint-disable-next-line import/no-default-export
export default function esoPlugin(kibana: any) {
  return new kibana.Plugin({
    id: 'eso',
    require: ['encryptedSavedObjects'],
    uiExports: { mappings: require('./mappings.json') },
    init(server: Legacy.Server) {
      server.route({
        method: 'GET',
        path: '/api/saved_objects/get-decrypted-as-internal-user/{id}',
        async handler(request: Request) {
          const encryptedSavedObjectsStart = server.newPlatform.start.plugins
            .encryptedSavedObjects as PluginStartContract;
          const namespace = server.plugins.spaces && server.plugins.spaces.getSpaceId(request);
          try {
            return await encryptedSavedObjectsStart.getDecryptedAsInternalUser(
              SAVED_OBJECT_WITH_SECRET_TYPE,
              request.params.id,
              { namespace: namespace === 'default' ? undefined : namespace }
            );
          } catch (err) {
            if (encryptedSavedObjectsStart.isEncryptionError(err)) {
              return badRequest('Failed to encrypt attributes');
            }

            return boomify(err);
          }
        },
      });

      (server.newPlatform.setup.plugins.encryptedSavedObjects as PluginSetupContract).registerType({
        type: SAVED_OBJECT_WITH_SECRET_TYPE,
        attributesToEncrypt: new Set(['privateProperty']),
        attributesToExcludeFromAAD: new Set(['publicPropertyExcludedFromAAD']),
      });
    },
  });
}
