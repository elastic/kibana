/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AI_SEARCH = i18n.translate('xpack.securitySolution.ruleSearch.aiSearch', {
  defaultMessage: 'AI search',
});

export const AI_ON_HINT = i18n.translate('xpack.securitySolution.ruleSearch.aiOnHint', {
  defaultMessage:
    'AI search is on: finds rules by meaning, in any language, the most relevant first. Click to find every rule that contains the text.',
});

export const AI_OFF_BY_USER_HINT = i18n.translate(
  'xpack.securitySolution.ruleSearch.aiOffByUserHint',
  {
    defaultMessage:
      'AI search is off: finds every rule whose name, index pattern or MITRE ATT&CK tactic or technique contains the text. Click to search by meaning.',
  }
);

export const AI_OFF_HINT = i18n.translate('xpack.securitySolution.ruleSearch.aiOffInSpaceHint', {
  defaultMessage:
    'AI search is off in this space. An admin can turn it on in Workflows: "Security: index detection rules for search by meaning".',
});

export const AI_INDEXING_HINT = i18n.translate('xpack.securitySolution.ruleSearch.aiIndexingHint', {
  defaultMessage: 'Indexing rules for AI search…',
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
  defaultMessage: 'Need every match? Turn off AI search',
});

export const KEYWORD_RESULTS = (count: number, text: string) =>
  i18n.translate('xpack.securitySolution.ruleSearch.keywordResults', {
    values: { count, text },
    defaultMessage: '{count, plural, one {# rule contains} other {# rules contain}} "{text}".',
  });

export const AI_UNAVAILABLE = i18n.translate('xpack.securitySolution.ruleSearch.aiUnavailable', {
  defaultMessage: 'AI search is unavailable right now. Showing the rules that contain the text.',
});
