/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { AlertExecuteOptions } from '../../../../../plugins/alerting';
import { ActionTypeExecutorOptions } from '../../../../../plugins/actions';

// eslint-disable-next-line import/no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    require: ['actions', 'alerting', 'elasticsearch'],
    name: 'alerts',
    init(server: any) {
      const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');

      // Action types
      server.plugins.actions.registerType({
        id: 'test.index-record',
        name: 'Test: Index Record',
        unencryptedAttributes: ['unencrypted'],
        validate: {
          params: Joi.object()
            .keys({
              index: Joi.string().required(),
              reference: Joi.string().required(),
              message: Joi.string().required(),
            })
            .required(),
          actionTypeConfig: Joi.object()
            .keys({
              encrypted: Joi.string().required(),
              unencrypted: Joi.string().required(),
            })
            .required(),
        },
        async executor({ actionTypeConfig, params }: ActionTypeExecutorOptions) {
          return await callWithInternalUser('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              params,
              config: actionTypeConfig,
              reference: params.reference,
              source: 'action:test.index-record',
            },
          });
        },
      });
      server.plugins.actions.registerType({
        id: 'test.failing',
        name: 'Test: Failing',
        validate: {
          params: Joi.object()
            .keys({
              index: Joi.string().required(),
              reference: Joi.string().required(),
            })
            .required(),
        },
        async executor({ actionTypeConfig, params }: ActionTypeExecutorOptions) {
          await callWithInternalUser('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              params,
              config: actionTypeConfig,
              reference: params.reference,
              source: 'action:test.failing',
            },
          });
          throw new Error('Failed to execute action type');
        },
      });

      // Alert types
      server.plugins.alerting.registerType({
        id: 'test.always-firing',
        description: 'Test: Always Firing',
        async execute({ services, params, state }: AlertExecuteOptions) {
          const actionGroupToFire = params.actionGroupToFire || 'default';
          services
            .alertInstanceFactory('1')
            .replaceState({ instanceStateValue: true })
            .fire(actionGroupToFire, {
              instanceContextValue: true,
            });
          await callWithInternalUser('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              state,
              params,
              reference: params.reference,
              source: 'alert:test.always-firing',
            },
          });
          return {
            globalStateValue: true,
          };
        },
      });
      server.plugins.alerting.registerType({
        id: 'test.never-firing',
        description: 'Test: Never firing',
        async execute({ services, params, state }: AlertExecuteOptions) {
          await callWithInternalUser('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              state,
              params,
              reference: params.reference,
              source: 'alert:test.never-firing',
            },
          });
          return {
            globalStateValue: true,
          };
        },
      });
      server.plugins.alerting.registerType({
        id: 'test.failing',
        description: 'Test: Failing',
        async execute({ services, params, state }: AlertExecuteOptions) {
          await callWithInternalUser('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              state,
              params,
              reference: params.reference,
              source: 'alert:test.failing',
            },
          });
          throw new Error('Failed to execute alert type');
        },
      });
      server.plugins.alerting.registerType({
        id: 'test.noop',
        description: 'Test: Noop',
        async execute({ services, params, state }: AlertExecuteOptions) {},
      });
    },
  });
}
