/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { MigrationTranslationResult } from '../../../../../common/siem_migrations/constants';
import {
  useResultVisColors,
  convertTranslationResultIntoColor,
  convertTranslationResultIntoText,
} from '.';
import * as i18n from './translations';

jest.mock('@elastic/eui', () => ({
  useEuiTheme: jest.fn(),
}));

describe('translation_results index', () => {
  describe('useResultVisColors', () => {
    it('returns default colors for Borealis theme', () => {
      (useEuiTheme as jest.Mock).mockReturnValue({
        euiTheme: {
          themeName: 'EUI_THEME_BOREALIS',
        },
      });

      const { result } = renderHook(() => useResultVisColors());

      expect(result.current).toEqual({
        [MigrationTranslationResult.FULL]: '#54B399',
        [MigrationTranslationResult.PARTIAL]: '#D6BF57',
        [MigrationTranslationResult.UNTRANSLATABLE]: '#DA8B45',
        error: '#E7664C',
      });
    });
  });

  describe('convertTranslationResultIntoColor', () => {
    it('returns correct color for FULL', () => {
      expect(convertTranslationResultIntoColor(MigrationTranslationResult.FULL)).toBe('#54B399');
    });

    it('returns correct color for PARTIAL', () => {
      expect(convertTranslationResultIntoColor(MigrationTranslationResult.PARTIAL)).toBe('#D6BF57');
    });

    it('returns correct color for UNTRANSLATABLE', () => {
      expect(convertTranslationResultIntoColor(MigrationTranslationResult.UNTRANSLATABLE)).toBe(
        '#DA8B45'
      );
    });

    it('returns subdued for default case', () => {
      expect(convertTranslationResultIntoColor(undefined)).toBe('subdued');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(convertTranslationResultIntoColor('some-other-status' as any)).toBe('subdued');
    });
  });

  describe('convertTranslationResultIntoText', () => {
    it('returns correct text for FULL', () => {
      expect(convertTranslationResultIntoText(MigrationTranslationResult.FULL)).toBe(
        i18n.SIEM_TRANSLATION_RESULT_FULL_LABEL
      );
    });

    it('returns correct text for PARTIAL', () => {
      expect(convertTranslationResultIntoText(MigrationTranslationResult.PARTIAL)).toBe(
        i18n.SIEM_TRANSLATION_RESULT_PARTIAL_LABEL
      );
    });

    it('returns correct text for UNTRANSLATABLE', () => {
      expect(convertTranslationResultIntoText(MigrationTranslationResult.UNTRANSLATABLE)).toBe(
        i18n.SIEM_TRANSLATION_RESULT_UNTRANSLATABLE_LABEL
      );
    });

    it('returns unknown label for default case', () => {
      expect(convertTranslationResultIntoText(undefined)).toBe(
        i18n.SIEM_TRANSLATION_RESULT_UNKNOWN_LABEL
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(convertTranslationResultIntoText('some-other-status' as any)).toBe(
        i18n.SIEM_TRANSLATION_RESULT_UNKNOWN_LABEL
      );
    });
  });
});
