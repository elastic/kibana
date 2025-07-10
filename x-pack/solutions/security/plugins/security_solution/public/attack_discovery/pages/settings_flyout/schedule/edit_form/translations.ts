/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SCHEDULE_SAVE_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.form.saveButtonTitle',
  {
    defaultMessage: 'Save',
  }
);

export const SCHEDULE_NAME_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.nameFieldLabel',
  {
    defaultMessage: 'Name',
  }
);

export const SCHEDULE_CONNECTOR_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.connectorFieldLabel',
  {
    defaultMessage: 'Connector',
  }
);

export const SCHEDULE_CONNECTOR_FIELD_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.connectorFieldHelpText',
  {
    defaultMessage: 'This connector will apply to this schedule, only.',
  }
);

export const SCHEDULE_RUN_EVERY_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.runEveryFieldLabel',
  {
    defaultMessage: 'Run every',
  }
);
