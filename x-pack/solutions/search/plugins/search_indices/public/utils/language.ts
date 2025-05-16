/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AvailableLanguages, Languages } from '../code_examples';

export function getDefaultCodingLanguage(): AvailableLanguages {
  const defaultLang = readConsoleDefaultLanguage() ?? 'python';
  return defaultLang;
}

const validLanguages = Object.keys(Languages);

const CONSOLE_DEFAULT_LANGUAGE_KEY = 'sense:defaultLanguage';
function readConsoleDefaultLanguage() {
  const consoleLanguageValue = localStorage
    .getItem(CONSOLE_DEFAULT_LANGUAGE_KEY)
    ?.replaceAll('"', ''); // Console is storing the value wrapped in "", so we want to remove them
  if (consoleLanguageValue && validLanguages.includes(consoleLanguageValue)) {
    return consoleLanguageValue as AvailableLanguages;
  }
  return undefined;
}
