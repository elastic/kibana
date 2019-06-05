/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { Legacy } from 'kibana';

// eslint-disable-next-line import/no-default-export
export default function actionsPlugin(kibana: any) {
  return new kibana.Plugin({
    id: 'actions-test',
    require: ['actions'],
    init(server: Legacy.Server) {
      server.route({
        method: 'POST',
        path: '/api/action/{id}/fire',
        options: {
          validate: {
            params: Joi.object()
              .keys({
                id: Joi.string().required(),
              })
              .required(),
            payload: Joi.object()
              .keys({
                params: Joi.object(),
              })
              .required(),
          },
        },
        async handler(request: any) {
          await request.server.plugins.actions.fire({
            id: request.params.id,
            params: request.payload.params,
          });
          return { success: true };
        },
      });
    },
  });
}
