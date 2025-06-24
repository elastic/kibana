/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageOverviewRuleActivity } from '../../../../../common/api/detection_engine';
import { getCoverageOverviewFilterMock } from '../../../../../common/api/detection_engine/rule_management/coverage_overview/coverage_overview_route.mock';
import { ruleActivityFilterDefaultOptions } from './constants';
import { extractSelected, populateSelected } from './helpers';

describe('helpers', () => {
  describe('extractSelected', () => {
    it('returns empty array when no options are checked', () => {
      const payload = ruleActivityFilterDefaultOptions;
      expect(extractSelected(payload)).toEqual([]);
    });

    it('returns checked options when present', () => {
      const payload = [
        ...ruleActivityFilterDefaultOptions,
        { ...ruleActivityFilterDefaultOptions[0], checked: 'on' as const },
      ];
      expect(extractSelected(payload)).toEqual([ruleActivityFilterDefaultOptions[0].label]);
    });
  });

  describe('populateSelected', () => {
    it('returns default status options when no filter is present', () => {
      const payload: CoverageOverviewRuleActivity[] = [];
      expect(populateSelected(ruleActivityFilterDefaultOptions, payload)).toEqual(
        ruleActivityFilterDefaultOptions
      );
    });

    it('returns correct options checked when present in filter', () => {
      const payload = getCoverageOverviewFilterMock().activity;
      expect(populateSelected(ruleActivityFilterDefaultOptions, payload)).toEqual([
        { label: 'enabled', checked: 'on' },
        { label: 'disabled' },
      ]);
    });
  });
});
