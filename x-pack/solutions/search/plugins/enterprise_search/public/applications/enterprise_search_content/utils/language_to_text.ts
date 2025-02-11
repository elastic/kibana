/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UNIVERSAL_LANGUAGE_VALUE = '';

export const languageToTextMap: Record<string, string | undefined> = {
  [UNIVERSAL_LANGUAGE_VALUE]: i18n.translate(
    'xpack.enterpriseSearch.content.supportedLanguages.universalLabel',
    {
      defaultMessage: 'Universal',
    }
  ),
  da: i18n.translate('xpack.enterpriseSearch.content.supportedLanguages.danishLabel', {
    defaultMessage: 'Danish',
  }),
  de: i18n.translate('xpack.enterpriseSearch.content.supportedLanguages.germanLabel', {
    defaultMessage: 'German',
  }),
  en: i18n.translate('xpack.enterpriseSearch.content.supportedLanguages.englishLabel', {
    defaultMessage: 'English',
  }),
  es: i18n.translate('xpack.enterpriseSearch.content.supportedLanguages.spanishLabel', {
    defaultMessage: 'Spanish',
  }),

  fr: i18n.translate('xpack.enterpriseSearch.content.supportedLanguages.frenchLabel', {
    defaultMessage: 'French',
  }),

  it: i18n.translate('xpack.enterpriseSearch.content.supportedLanguages.italianLabel', {
    defaultMessage: 'Italian',
  }),
  ja: i18n.translate('xpack.enterpriseSearch.content.supportedLanguages.japaneseLabel', {
    defaultMessage: 'Japanese',
  }),
  ko: i18n.translate('xpack.enterpriseSearch.content.supportedLanguages.koreanLabel', {
    defaultMessage: 'Korean',
  }),

  nl: i18n.translate('xpack.enterpriseSearch.content.supportedLanguages.dutchLabel', {
    defaultMessage: 'Dutch',
  }),
  pt: i18n.translate('xpack.enterpriseSearch.content.supportedLanguages.portugueseLabel', {
    defaultMessage: 'Portuguese',
  }),
  'pt-br': i18n.translate(
    'xpack.enterpriseSearch.content.supportedLanguages.portugueseBrazilLabel',
    {
      defaultMessage: 'Portuguese (Brazil)',
    }
  ),
  ru: i18n.translate('xpack.enterpriseSearch.content.supportedLanguages.russianLabel', {
    defaultMessage: 'Russian',
  }),
  th: i18n.translate('xpack.enterpriseSearch.content.supportedLanguages.thaiLabel', {
    defaultMessage: 'Thai',
  }),
  zh: i18n.translate('xpack.enterpriseSearch.content.supportedLanguages.chineseLabel', {
    defaultMessage: 'Chinese',
  }),
};

export function languageToText(input: string): string {
  return languageToTextMap[input] ?? input;
}
