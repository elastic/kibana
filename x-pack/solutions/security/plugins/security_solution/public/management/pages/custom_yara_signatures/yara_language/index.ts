/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/code-editor';
import { yaraCompletionProvider } from './completion';
import { YARA_LANG_ID } from './constants';
import { languageConfiguration, lexerRules } from './language';
import { buildYaraTheme } from './theme';

export { YARA_LANG_ID } from './constants';

/** Registers the YARA language, its theme and autocomplete in Monaco, it is safe to call it multiple times. */
export const registerYaraLanguage = (): void => {
  if (monaco.languages.getLanguages().some(({ id }) => id === YARA_LANG_ID)) {
    return;
  }

  monaco.languages.register({ id: YARA_LANG_ID });
  monaco.editor.registerLanguageThemeResolver(YARA_LANG_ID, buildYaraTheme);

  monaco.languages.onLanguage(YARA_LANG_ID, () => {
    monaco.languages.setMonarchTokensProvider(YARA_LANG_ID, lexerRules);
    monaco.languages.setLanguageConfiguration(YARA_LANG_ID, languageConfiguration);
    monaco.languages.registerCompletionItemProvider(YARA_LANG_ID, yaraCompletionProvider);
  });
};
