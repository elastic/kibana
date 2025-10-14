/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALREADY_TRANSLATED_RULE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.alreadyTranslatedTooltip',
  {
    defaultMessage: 'Already translated migration rule',
  }
);

export const NOT_FULLY_TRANSLATED_RULE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.notFullyTranslatedTooltip',
  {
    defaultMessage: 'Not fully translated migration rule',
  }
);

export const INSTALL_WITHOUT_ENABLING_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.installWithoutEnablingButtonLabel',
  {
    defaultMessage: 'Install without enabling',
  }
);

export const INSTALL_AND_ENABLE_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.installAndEnableButtonLabel',
  {
    defaultMessage: 'Install and enable',
  }
);
