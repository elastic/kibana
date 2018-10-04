/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function (kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch', 'xpack_main'],
    name: 'xpack_info_checker',

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server) {
      server.route({
        path: '/api/xpack_main_info/info',
        method: 'GET',
        handler(req, reply) {
          const xpackMainPlugin = server.plugins.xpack_main;
          reply({ info: xpackMainPlugin.info });
        }
      });
    }
  });
}
