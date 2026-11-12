/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageOverviewRuleActivity } from '../../../../../common/api/detection_engine';
import { getCoverageOverviewFilterMock } from '../../../../../common/api/detection_engine/rule_management/coverage_overview/coverage_overview_route.mock';
import { ruleActivityFilterDefaultOptions } from './constants';
import {
  extractSelected,
  filterInvalidlyMappedRulesByFramework,
  populateSelected,
} from './helpers';

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

  describe('filterInvalidlyMappedRulesByFramework', () => {
    const invalidlyMappedRules = {
      enabledRules: [
        { id: 'both', name: 'Both', invalidMitreIds: ['T9999', 'AML.T9999'] },
        { id: 'atlas-only', name: 'Atlas only', invalidMitreIds: ['AML.TA9999'] },
      ],
      disabledRules: [
        { id: 'enterprise-only', name: 'Enterprise only', invalidMitreIds: ['T1234'] },
      ],
    };

    it('keeps only enterprise IDs and drops rules left without IDs', () => {
      expect(filterInvalidlyMappedRulesByFramework(invalidlyMappedRules, 'enterprise')).toEqual({
        enabledRules: [{ id: 'both', name: 'Both', invalidMitreIds: ['T9999'] }],
        disabledRules: [
          { id: 'enterprise-only', name: 'Enterprise only', invalidMitreIds: ['T1234'] },
        ],
      });
    });

    it('keeps only atlas IDs and drops rules left without IDs', () => {
      expect(filterInvalidlyMappedRulesByFramework(invalidlyMappedRules, 'atlas')).toEqual({
        enabledRules: [
          { id: 'both', name: 'Both', invalidMitreIds: ['AML.T9999'] },
          { id: 'atlas-only', name: 'Atlas only', invalidMitreIds: ['AML.TA9999'] },
        ],
        disabledRules: [],
      });
    });

    it('returns empty lists when there is no data', () => {
      expect(filterInvalidlyMappedRulesByFramework(undefined, 'atlas')).toEqual({
        enabledRules: [],
        disabledRules: [],
      });
    });
  });
});
