/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MODE_LEGEND = i18n.translate('xpack.securitySolution.ruleSearch.mode.legend', {
  defaultMessage: 'Search mode',
});

export const MODE_AI = i18n.translate('xpack.securitySolution.ruleSearch.mode.ai', {
  defaultMessage: 'AI',
});

export const MODE_KEYWORD = i18n.translate('xpack.securitySolution.ruleSearch.mode.keyword', {
  defaultMessage: 'Keyword',
});

export const AI_HINT = i18n.translate('xpack.securitySolution.ruleSearch.mode.aiHint', {
  defaultMessage:
    'Finds rules by meaning, in any language, and shows the most relevant ones first.',
});

export const AI_OFF_HINT = i18n.translate('xpack.securitySolution.ruleSearch.mode.aiOffHint', {
  defaultMessage:
    'AI search is off in this space. An admin can turn it on in Workflows: "Security: index detection rules for search by meaning".',
});

export const AI_INDEXING_HINT = i18n.translate(
  'xpack.securitySolution.ruleSearch.mode.aiIndexingHint',
  { defaultMessage: 'Indexing rules for AI search…' }
);

export const KEYWORD_HINT = i18n.translate('xpack.securitySolution.ruleSearch.mode.keywordHint', {
  defaultMessage:
    'Finds every rule whose name, index pattern or MITRE ATT&CK tactic or technique contains the text.',
});

export const AI_PLACEHOLDER = i18n.translate('xpack.securitySolution.ruleSearch.aiPlaceholder', {
  defaultMessage: 'Describe what the rule detects, in any language',
});

export const AI_RESULTS = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSearch.aiResults', {
    values: { count },
    defaultMessage:
      'AI search: {count, plural, one {# most relevant rule} other {# most relevant rules}}, best first.',
  });

export const NEED_EVERY_MATCH = i18n.translate('xpack.securitySolution.ruleSearch.needEveryMatch', {
  defaultMessage: 'Need every match? Keyword',
});

export const KEYWORD_RESULTS = (count: number, text: string) =>
  i18n.translate('xpack.securitySolution.ruleSearch.keywordResults', {
    values: { count, text },
    defaultMessage:
      'Keyword search: {count, plural, one {# rule matches} other {# rules match}} "{text}".',
  });

export const AI_UNAVAILABLE = i18n.translate('xpack.securitySolution.ruleSearch.aiUnavailable', {
  defaultMessage: 'AI search is unavailable right now. Showing keyword results.',
});
