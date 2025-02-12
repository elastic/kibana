/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TAB_HEADER_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.title',
  {
    defaultMessage: 'Translation',
  }
);

export const NAME_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.nameLabel',
  {
    defaultMessage: 'Name',
  }
);

export const NAME_REQUIRED_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.nameFieldRequiredError',
  {
    defaultMessage: 'A name is required.',
  }
);

export const INSTALLED_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.installedLabel',
  {
    defaultMessage: 'Installed',
  }
);

export const CALLOUT_TRANSLATED_RULE_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.translatedRuleCalloutTitle',
  {
    defaultMessage:
      'This rule has been fully translated. Install rule to finish migration. Once installed, you’ll be able to fine tune the rule.',
  }
);

export const CALLOUT_MAPPED_TRANSLATED_RULE_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.mappedTranslatedRuleCalloutTitle',
  {
    defaultMessage:
      'This rule was mapped to an Elastic authored rule. Click Install & enable rule to complete migration. You can fine-tune it later.',
  }
);

export const CALLOUT_PARTIALLY_TRANSLATED_RULE_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.partiallyTranslatedRuleCalloutTitle',
  {
    defaultMessage: 'Part of the query could not be translated.',
  }
);

export const CALLOUT_PARTIALLY_TRANSLATED_RULE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.partiallyTranslatedRuleCalloutDescription',
  {
    defaultMessage:
      'To save this rule, finish writing the query. If you need help, please contact Elastic support.',
  }
);

export const CALLOUT_NOT_TRANSLATED_RULE_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.notTranslatedRuleCalloutTitle',
  {
    defaultMessage: 'This query couldn’t be translated.',
  }
);

export const CALLOUT_NOT_TRANSLATED_RULE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.notTranslatedRuleCalloutDescription',
  {
    defaultMessage:
      'This might be caused by feature differences between SIEM products. If possible, update the rule manually.',
  }
);

export const CALLOUT_TRANSLATED_RULE_INFO_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.partiallyTranslatedRuleCalloutTitle',
  {
    defaultMessage: 'Translation successful. Install the rule to customize it.',
  }
);

export const CALLOUT_TRANSLATED_RULE_INFO_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.translationTab.partiallyTranslatedRuleCalloutDescription',
  {
    defaultMessage:
      'After you install the rule, you can modify or update it with full access to all features.',
  }
);
