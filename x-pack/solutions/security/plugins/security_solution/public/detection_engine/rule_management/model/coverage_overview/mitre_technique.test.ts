/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageOverviewMitreTactic } from './mitre_tactic';
import { getNumOfCoveredTechniques } from './mitre_technique';
import {
  getMockCoverageOverviewMitreTactic,
  getMockCoverageOverviewMitreTechnique,
} from './__mocks__';

describe('mitre_technique', () => {
  describe('getNumOfCoveredTechniques', () => {
    it('returns 0 when no techniques are present', () => {
      const payload: CoverageOverviewMitreTactic = getMockCoverageOverviewMitreTactic();
      expect(getNumOfCoveredTechniques(payload)).toEqual(0);
    });

    it('returns number of techniques when present', () => {
      const payload: CoverageOverviewMitreTactic = {
        ...getMockCoverageOverviewMitreTactic(),
        techniques: [
          getMockCoverageOverviewMitreTechnique(),
          getMockCoverageOverviewMitreTechnique(),
        ],
      };
      expect(getNumOfCoveredTechniques(payload)).toEqual(2);
    });
  });
});
