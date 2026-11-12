/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Why a Nightshift manager cannot change automations: they run as the space's automations service
 * account, and writing a workflow bound to a service account requires `manage_security`.
 */
export const MANAGE_SECURITY_REQUIRED_REASON = i18n.translate(
  'xpack.nightshift.automations.manageSecurityRequiredReason',
  {
    defaultMessage:
      'Requires the manage_security cluster privilege, because automations run as the Nightshift automations service account.',
  }
);

export const MANAGE_SECURITY_REQUIRED_TITLE = i18n.translate(
  'xpack.nightshift.automations.manageSecurityRequiredTitle',
  { defaultMessage: "You can view automations but can't change them" }
);

export const MANAGE_SECURITY_REQUIRED_BODY = i18n.translate(
  'xpack.nightshift.automations.manageSecurityRequiredBody',
  {
    defaultMessage:
      'Automations run as the Nightshift automations service account, not as the person who created them. Creating, editing, pausing, or deleting them changes a workflow bound to that account, which requires the manage_security cluster privilege. Ask an administrator to make the change, or to grant you that privilege.',
  }
);
