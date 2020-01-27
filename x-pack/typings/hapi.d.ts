/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'hapi';

import { XPackMainPlugin } from '../legacy/plugins/xpack_main/server/xpack_main';
import { SecurityPlugin } from '../legacy/plugins/security';
import { ActionsPlugin, ActionsClient } from '../legacy/plugins/actions';
import { TaskManager } from '../legacy/plugins/task_manager';
import { AlertingPlugin, AlertsClient } from '../legacy/plugins/alerting';

declare module 'hapi' {
  interface Request {
    getActionsClient?: () => ActionsClient;
    getAlertsClient?: () => AlertsClient;
  }
  interface PluginProperties {
    xpack_main: XPackMainPlugin;
    security?: SecurityPlugin;
    actions?: ActionsPlugin;
    alerting?: AlertingPlugin;
    task_manager?: TaskManager;
  }
}
