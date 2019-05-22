/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initRoutes } from './init_routes';

export default function (kibana) {
  return new kibana.Plugin({
    name: 'oidcProvider',
    id: 'oidcProvider',
    require: ['elasticsearch'],

    init(server) {
      initRoutes(server);
    },
  });
}
