/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line import/no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    require: ['actions'],
    name: 'alerts',
    init(server: any) {
      server.plugins.actions.registerType({
        id: 'test',
        name: 'Test',
        unencryptedAttributes: ['unencrypted'],
        async executor({ actionTypeConfig, params }: { actionTypeConfig: any; params: any }) {
          return { success: true, actionTypeConfig, params };
        },
      });
    },
  });
}
