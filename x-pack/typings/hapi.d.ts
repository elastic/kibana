/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'hapi';

import { CloudPlugin } from '../legacy/plugins/cloud';
import { EncryptedSavedObjectsPlugin } from '../legacy/plugins/encrypted_saved_objects';
import { XPackMainPlugin } from '../legacy/plugins/xpack_main/xpack_main';
import { SecurityPlugin } from '../legacy/plugins/security';
import { ActionsPlugin, ActionsClient } from '../legacy/plugins/actions';
import { TaskManager } from '../legacy/plugins/task_manager';
import { AlertingPlugin, AlertsClient } from '../legacy/plugins/alerting';

declare module 'hapi' {
  interface Server {
    taskManager?: TaskManager;
  }
  interface Request {
    getActionsClient?: () => ActionsClient;
    getAlertsClient?: () => AlertsClient;
  }
  interface PluginProperties {
    cloud?: CloudPlugin;
    xpack_main: XPackMainPlugin;
    security?: SecurityPlugin;
    encrypted_saved_objects?: EncryptedSavedObjectsPlugin;
    actions?: ActionsPlugin;
    alerting?: AlertingPlugin;
  }
}
