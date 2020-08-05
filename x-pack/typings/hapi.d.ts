/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'hapi';

import { XPackMainPlugin } from '../legacy/plugins/xpack_main/server/xpack_main';
import { ActionsPlugin, ActionsClient } from '../plugins/actions/server';
import { AlertingPlugin, AlertsClient } from '../plugins/alerts/server';
import { TaskManager } from '../plugins/task_manager/server';

declare module 'hapi' {
  interface Request {
    getActionsClient?: () => ActionsClient;
    getAlertsClient?: () => AlertsClient;
  }
  interface PluginProperties {
    xpack_main: XPackMainPlugin;
    actions?: ActionsPlugin;
    alerts?: AlertingPlugin;
    task_manager?: TaskManager;
  }
}
