/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AGENT_BUILDER_PRIVILEGE_CALLOUT_MESSAGE = i18n.translate(
  'xpack.alertzero.agentBuilderPrivilegeCallout.message',
  {
    defaultMessage:
      'Some features are unavailable. You need the Agent Builder Kibana privilege to open investigations and chats. Ask an administrator to update your role.',
  }
);
