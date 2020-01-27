/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';
import { Legacy } from 'kibana';
import KbnServer from '../../../../../../../src/legacy/server/kbn_server';
import { PluginStartContract } from '../../../../../../plugins/encrypted_saved_objects/server';

interface CheckAADRequest extends Hapi.Request {
  payload: {
    spaceId?: string;
    type: string;
    id: string;
  };
}

// eslint-disable-next-line import/no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    require: ['actions', 'alerting', 'encryptedSavedObjects'],
    name: 'aad-fixtures',
    init(server: Legacy.Server) {
      const newPlatform = ((server as unknown) as KbnServer).newPlatform;
      const esoPlugin = newPlatform.start.plugins.encryptedSavedObjects as PluginStartContract;

      server.route({
        method: 'POST',
        path: '/api/check_aad',
        options: {
          validate: {
            payload: Joi.object()
              .keys({
                spaceId: Joi.string().optional(),
                type: Joi.string().required(),
                id: Joi.string().required(),
              })
              .required(),
          },
        },
        async handler(request: CheckAADRequest) {
          let namespace: string | undefined;
          const spacesPlugin = server.plugins.spaces;
          if (spacesPlugin && request.payload.spaceId) {
            namespace = spacesPlugin.spaceIdToNamespace(request.payload.spaceId);
          }
          await esoPlugin.getDecryptedAsInternalUser(request.payload.type, request.payload.id, {
            namespace,
          });
          return { success: true };
        },
      });
    },
  });
}
