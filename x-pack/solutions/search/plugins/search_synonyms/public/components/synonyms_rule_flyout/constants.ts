/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_MESSAGES = {
  empty_from_term: i18n.translate('xpack.searchSynonyms.synonymsSetRuleFlyout.invalidTerm', {
    defaultMessage: 'Term cannot be empty.',
  }),
  empty_to_term: i18n.translate('xpack.searchSynonyms.synonymsSetRuleFlyout.invalidMapTo', {
    defaultMessage: 'Cannot have empty terms.',
  }),
  term_exists: i18n.translate('xpack.searchSynonyms.synonymsSetRuleFlyout.termExists', {
    defaultMessage: 'Term already exists',
  }),
  multiple_explicit_separator: i18n.translate(
    'xpack.searchSynonyms.synonymsSetRuleFlyout.invalidMapTo',
    { defaultMessage: 'Cannot have explicit separator "=>" in terms.' }
  ),
};
