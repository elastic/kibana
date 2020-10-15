/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pageObjects as xpackFunctionalPageObjects } from '../../functional/page_objects';
import { TriggersActionsPageProvider } from './triggers_actions_ui_page';
import { AlertDetailsPageProvider } from './alert_details';

export const pageObjects = {
  ...xpackFunctionalPageObjects,
  triggersActionsUI: TriggersActionsPageProvider,
  alertDetailsUI: AlertDetailsPageProvider,
};
