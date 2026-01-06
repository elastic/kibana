/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { registerLocale, getName, isValid } from 'i18n-iso-countries';
import countryJsonEn from 'i18n-iso-countries/langs/en.json';
import countryJsonFr from 'i18n-iso-countries/langs/fr.json';
import countryJsonJa from 'i18n-iso-countries/langs/ja.json';
import countryJsonZh from 'i18n-iso-countries/langs/zh.json';

registerLocale(countryJsonEn);
registerLocale(countryJsonFr);
registerLocale(countryJsonJa);
registerLocale(countryJsonZh);

/**
 * Returns the full country name for a given country code, or null if the specified
 * country code could not be converted
 * Example: `US` -> 'United States'
 * Example: `USA` -> 'United States'
 */
export const getCountryName = (countryCode: string): string | null => {
  if (!isValid(countryCode)) {
    return null;
  }

  return getName(countryCode.toUpperCase(), i18n.getLocale() || 'en') || null;
};

/**
 * Returns the flag for the specified country code, or null if the specified
 * country code could not be converted
 * Example: `US` -> 🇺🇸
 */
export const getCountryFlag = (countryCode: string): string | null => {
  if (!isValid(countryCode) || countryCode.length !== 2) {
    return null;
  }

  return countryCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCharCode(55356, 56741 + c.charCodeAt(0)));
};
