/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { AlertExecutorOptions, AlertType } from '../../../../../legacy/plugins/alerting';
import { ActionTypeExecutorOptions, ActionType } from '../../../../../legacy/plugins/actions';

// eslint-disable-next-line import/no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    require: ['actions', 'alerting', 'elasticsearch'],
    name: 'alerts',
    init(server: any) {
      // Action types
      const indexRecordActionType: ActionType = {
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
          config: Joi.object()
            .keys({
              encrypted: Joi.string().required(),
              unencrypted: Joi.string().required(),
            })
            .required(),
        },
        async executor({ config, params, services }: ActionTypeExecutorOptions) {
          return await services.callCluster('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              params,
              config,
              reference: params.reference,
              source: 'action:test.index-record',
            },
          });
        },
      };
      const failingActionType: ActionType = {
        id: 'test.failing',
        name: 'Test: Failing',
        unencryptedAttributes: [],
        validate: {
          params: Joi.object()
            .keys({
              index: Joi.string().required(),
              reference: Joi.string().required(),
            })
            .required(),
        },
        async executor({ config, params, services }: ActionTypeExecutorOptions) {
          await services.callCluster('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              params,
              config,
              reference: params.reference,
              source: 'action:test.failing',
            },
          });
          throw new Error('Failed to execute action type');
        },
      };
      server.plugins.actions.registerType(indexRecordActionType);
      server.plugins.actions.registerType(failingActionType);

      // Alert types
      const alwaysFiringAlertType: AlertType = {
        id: 'test.always-firing',
        name: 'Test: Always Firing',
        async executor({ services, params, state }: AlertExecutorOptions) {
          const actionGroupToFire = params.actionGroupToFire || 'default';
          services
            .alertInstanceFactory('1')
            .replaceState({ instanceStateValue: true })
            .fire(actionGroupToFire, {
              instanceContextValue: true,
            });
          await services.callCluster('index', {
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
      };
      const neverFiringAlertType: AlertType = {
        id: 'test.never-firing',
        name: 'Test: Never firing',
        async executor({ services, params, state }: AlertExecutorOptions) {
          await services.callCluster('index', {
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
      };
      const failingAlertType: AlertType = {
        id: 'test.failing',
        name: 'Test: Failing',
        async executor({ services, params, state }: AlertExecutorOptions) {
          await services.callCluster('index', {
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
      };
      const validationAlertType: AlertType = {
        id: 'test.validation',
        name: 'Test: Validation',
        validate: {
          params: Joi.object()
            .keys({
              param1: Joi.string().required(),
            })
            .required(),
        },
        async executor({ services, params, state }: AlertExecutorOptions) {},
      };
      const noopAlertType: AlertType = {
        id: 'test.noop',
        name: 'Test: Noop',
        async executor({ services, params, state }: AlertExecutorOptions) {},
      };
      server.plugins.alerting.registerType(alwaysFiringAlertType);
      server.plugins.alerting.registerType(neverFiringAlertType);
      server.plugins.alerting.registerType(failingAlertType);
      server.plugins.alerting.registerType(validationAlertType);
      server.plugins.alerting.registerType(noopAlertType);
    },
  });
}
