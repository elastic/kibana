/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoverageOverviewRuleActivity } from '../../../../../common/api/detection_engine';
import { getNumOfCoveredSubtechniques } from './mitre_subtechnique';
import type { CoverageOverviewMitreTechnique } from './mitre_technique';
import {
  getMockCoverageOverviewMitreSubTechnique,
  getMockCoverageOverviewMitreTechnique,
} from './__mocks__';

describe('mitre_subtechniques', () => {
  describe('getNumOfCoveredSubtechniques', () => {
    it('returns 0 when no subtechniques are present', () => {
      const payload: CoverageOverviewMitreTechnique = getMockCoverageOverviewMitreTechnique();
      expect(getNumOfCoveredSubtechniques(payload)).toEqual(0);
    });

    it('returns total number of unique enabled and disabled subtechniques when no filter is passed', () => {
      const payload: CoverageOverviewMitreTechnique = {
        ...getMockCoverageOverviewMitreTechnique(),
        subtechniques: [
          getMockCoverageOverviewMitreSubTechnique(),
          { ...getMockCoverageOverviewMitreSubTechnique(), id: 'test-id' },
        ],
      };
      expect(getNumOfCoveredSubtechniques(payload)).toEqual(2);
    });

    it('returns total number of unique enabled and disabled subtechniques when both filters are passed', () => {
      const payload: CoverageOverviewMitreTechnique = {
        ...getMockCoverageOverviewMitreTechnique(),
        subtechniques: [
          getMockCoverageOverviewMitreSubTechnique(),
          { ...getMockCoverageOverviewMitreSubTechnique(), id: 'test-id' },
        ],
      };
      expect(
        getNumOfCoveredSubtechniques(payload, [
          CoverageOverviewRuleActivity.Enabled,
          CoverageOverviewRuleActivity.Disabled,
        ])
      ).toEqual(2);
    });

    it('returns total number of enabled subtechniques when enabled filter is passed', () => {
      const payload: CoverageOverviewMitreTechnique = {
        ...getMockCoverageOverviewMitreTechnique(),
        subtechniques: [
          {
            ...getMockCoverageOverviewMitreSubTechnique(),
            enabledRules: [],
          },
          getMockCoverageOverviewMitreSubTechnique(),
        ],
      };
      expect(getNumOfCoveredSubtechniques(payload, [CoverageOverviewRuleActivity.Enabled])).toEqual(
        1
      );
    });

    it('returns total number of disabled subtechniques when disabled filter is passed', () => {
      const payload: CoverageOverviewMitreTechnique = {
        ...getMockCoverageOverviewMitreTechnique(),
        subtechniques: [
          {
            ...getMockCoverageOverviewMitreSubTechnique(),
            disabledRules: [],
          },
          getMockCoverageOverviewMitreSubTechnique(),
        ],
      };
      expect(
        getNumOfCoveredSubtechniques(payload, [CoverageOverviewRuleActivity.Disabled])
      ).toEqual(1);
    });
  });
});
