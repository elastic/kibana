/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertExecuteOptions } from '../../../../../plugins/alerting';

// eslint-disable-next-line import/no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    require: ['actions', 'alerting', 'elasticsearch'],
    name: 'alerts',
    init(server: any) {
      const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');

      server.plugins.actions.registerType({
        id: 'test',
        name: 'Test',
        unencryptedAttributes: ['unencrypted'],
        async executor({ actionTypeConfig, params }: { actionTypeConfig: any; params: any }) {
          return { success: true, actionTypeConfig, params };
        },
      });
      server.plugins.actions.registerType({
        id: 'test-index-record',
        name: 'Index a record into ES',
        async executor({ params }: { actionTypeConfig: any; params: any }) {
          return await callWithInternalUser('index', {
            index: params.index,
            refresh: 'wait_for',
            body: params.body,
          });
        },
      });

      server.plugins.alerting.registerType({
        id: 'test-cpu-check',
        description: 'Check CPU Usage',
        async execute({ services, params, state }: AlertExecuteOptions) {
          const cpuUsage = 100;
          if (cpuUsage >= params.threshold) {
            services
              .alertInstanceFactory(params.server)
              .replaceState({ lastCpuUsage: cpuUsage })
              .fire('default', {
                server: params.server,
                threshold: params.threshold,
              });
          }
          return {
            lastCpuUsage: cpuUsage,
          };
        },
      });
    },
  });
}
