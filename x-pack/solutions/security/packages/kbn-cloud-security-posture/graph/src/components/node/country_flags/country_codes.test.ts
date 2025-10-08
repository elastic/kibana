/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getCountryName, getCountryFlag } from './country_codes';

jest.mock('@kbn/i18n', () => ({
  i18n: {
    getLocale: jest.fn(),
  },
}));

const mockI18n = i18n as jest.Mocked<typeof i18n>;

describe('country_utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCountryName', () => {
    it('should return country name for valid country codes', () => {
      expect(getCountryName('US')).toBe('United States of America');
      expect(getCountryName('GB')).toBe('United Kingdom');
      expect(getCountryName('FR')).toBe('France');
      expect(getCountryName('DE')).toBe('Germany');
      expect(getCountryName('JP')).toBe('Japan');
    });

    it('should return country name for valid, longer country codes', () => {
      expect(getCountryName('USA')).toBe('United States of America');
      expect(getCountryName('ESP')).toBe('Spain');
    });

    it('should handle lowercase and mixed case input', () => {
      expect(getCountryName('us')).toBe('United States of America');
      expect(getCountryName('gB')).toBe('United Kingdom');
      expect(getCountryName('Fr')).toBe('France');
    });

    it('should return null for invalid country codes', () => {
      expect(getCountryName('UK')).toBeNull(); // UK is not a valid ISO code
      expect(getCountryName('XY')).toBeNull(); // Non-existent country
      expect(getCountryName('INVALID')).toBeNull();
    });

    it('should return null for empty or null-ish input', () => {
      expect(getCountryName('')).toBeNull();
      expect(getCountryName([] as unknown as string)).toBeNull();
      expect(getCountryName({} as unknown as string)).toBeNull();
      expect(getCountryName(0 as unknown as string)).toBeNull();
      expect(getCountryName(null as unknown as string)).toBeNull();
      expect(getCountryName(undefined as unknown as string)).toBeNull();
    });

    it('should use different locales when available', () => {
      mockI18n.getLocale.mockReturnValue('fr');
      expect(getCountryName('US')).toBe("États-Unis d'Amérique");
      expect(getCountryName('FR')).toBe('France');

      mockI18n.getLocale.mockReturnValue('ja');
      expect(getCountryName('US')).toBe('アメリカ合衆国');
      expect(getCountryName('JP')).toBe('日本');
    });

    it('should fallback to English when locale is null', () => {
      mockI18n.getLocale.mockReturnValue(null as unknown as string);
      expect(getCountryName('US')).toBe('United States of America');
    });
  });

  describe('getCountryFlag', () => {
    it('should return flag emoji for valid country codes', () => {
      expect(getCountryFlag('US')).toBe('🇺🇸');
      expect(getCountryFlag('GB')).toBe('🇬🇧');
      expect(getCountryFlag('FR')).toBe('🇫🇷');
      expect(getCountryFlag('DE')).toBe('🇩🇪');
      expect(getCountryFlag('JP')).toBe('🇯🇵');
      expect(getCountryFlag('CA')).toBe('🇨🇦');
      expect(getCountryFlag('AU')).toBe('🇦🇺');
      expect(getCountryFlag('IN')).toBe('🇮🇳');
    });

    it('should return null for non-2-char country codes', () => {
      expect(getCountryFlag('USA')).toBeNull();
      expect(getCountryFlag('ESP')).toBeNull();
    });

    it('should return null for invalid country codes', () => {
      expect(getCountryFlag('UK')).toBeNull(); // UK is not a valid ISO code
      expect(getCountryFlag('XY')).toBeNull(); // Non-existent country
      expect(getCountryFlag('ZZ')).toBeNull(); // Non-existent country
      expect(getCountryFlag('ABC')).toBeNull(); // Too long
      expect(getCountryFlag('A')).toBeNull(); // Too short
    });

    it('should return null for empty or null input', () => {
      expect(getCountryFlag('')).toBeNull();
      expect(getCountryFlag(null as unknown as string)).toBeNull();
      expect(getCountryFlag(undefined as unknown as string)).toBeNull();
    });

    it('should handle special cases and territories', () => {
      expect(getCountryFlag('HK')).toBe('🇭🇰'); // Hong Kong
      expect(getCountryFlag('PR')).toBe('🇵🇷'); // Puerto Rico
      expect(getCountryFlag('GU')).toBe('🇬🇺'); // Guam
    });

    it('should handle lowercase and mixed case input', () => {
      expect(getCountryFlag('us')).toBe('🇺🇸');
      expect(getCountryFlag('gB')).toBe('🇬🇧');
      expect(getCountryFlag('Fr')).toBe('🇫🇷');
    });
  });

  describe('integration between getCountryName and getCountryFlag', () => {
    it('should both return valid results for the same valid country codes', () => {
      const validCodes = ['US', 'GB', 'FR', 'DE', 'JP', 'CA', 'AU'];

      validCodes.forEach((code) => {
        expect(getCountryName(code)).not.toBeNull();
        expect(getCountryFlag(code)).not.toBeNull();
      });
    });

    it('should both return null for the same invalid country codes', () => {
      const invalidCodes = ['UK', 'XY', 'ZZ', 'ABC', 'A', ''];

      invalidCodes.forEach((code) => {
        expect(getCountryName(code)).toBeNull();
        expect(getCountryFlag(code)).toBeNull();
      });
    });
  });
});
