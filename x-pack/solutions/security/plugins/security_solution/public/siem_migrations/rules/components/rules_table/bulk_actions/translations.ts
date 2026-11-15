/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UPDATE_MISSING_INDEX_PATTERN = (numberOfRulesWithMissingIndex: number) => {
  return i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.table.updateMissingIndexPattern',
    {
      defaultMessage: 'Update missing index pattern ({numberOfRulesWithMissingIndex})',
      values: { numberOfRulesWithMissingIndex },
    }
  );
};

export const UPDATE_MISSING_INDEX_PATTERN_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.updateMissingIndexPatternButtonAriaLabel',
  {
    defaultMessage: 'Update missing index pattern',
  }
);

export const UPDATE_MISSING_INDEX_PATTERN_SELECTED_RULES = (numberOfSelectedRules: number) => {
  return i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.table.updateMissingIndexPatternSelectedRules',
    {
      defaultMessage: 'Update selected missing index pattern ({numberOfSelectedRules})',
      values: { numberOfSelectedRules },
    }
  );
};

export const ADD_TO_CHAT_BUTTON_LABEL = (count: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.rules.bulkAddToChatButton.label', {
    defaultMessage: 'Add to chat{count, plural, =0 {} other { ({count})}}',
    values: { count },
  });

export const ADD_TO_CHAT_ATTACHMENT_LABEL = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.bulkAddToChatButton.attachmentLabel',
    {
      defaultMessage: '{count, plural, =0 {all rules} one {# rule} other {# rules}}',
      values: { count },
    }
  );

export const ADD_TO_CHAT_PROMPT_WITH_SELECTION = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.bulkAddToChatButton.promptWithSelection',
    {
      defaultMessage:
        "I've attached {count, plural, one {# Automatic migration rule} other {# Automatic migration rules}}. How can you help?",
      values: { count },
    }
  );

export const ADD_TO_CHAT_PROMPT_ALL_RULES = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.bulkAddToChatButton.promptAllRules',
  {
    defaultMessage: "I've attached all rules in this Automatic migration. How can you help?",
  }
);
