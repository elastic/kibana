/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { useState } from 'react';

export interface AnomalyBand {
  start: number;
  end: number;
  color: string;
  hidden: boolean;
}

/**
 * Uses the `start` and `end` values of the band to determine equality, as the `color` value could theoretically change across renders (though not in practice)
 */
const bandsAreEqual = (a: AnomalyBand, b: AnomalyBand) => a.start === b.start && a.end === b.end;

export const useAnomalyBands: () => {
  bands: AnomalyBand[];
  toggleHiddenBand: (bandToToggle: AnomalyBand) => void;
} = () => {
  const { euiTheme } = useEuiTheme();

  const bandDefinitions = [
    { start: 0, end: 3, color: '#E5F6Fa' }, // TODO, this color needs to align with the usage in ML, ongoing discussion in this ticket: https://github.com/elastic/kibana/issues/217508. Issue to track this todo: https://github.com/elastic/security-team/issues/12810
    { start: 3, end: 25, color: euiTheme.colors.severity.neutral },
    { start: 25, end: 50, color: euiTheme.colors.severity.warning },
    { start: 50, end: 75, color: euiTheme.colors.severity.risk },
    { start: 75, end: 100, color: euiTheme.colors.severity.danger },
  ];

  const [bands, setBands] = useState<AnomalyBand[]>(
    bandDefinitions.map((each) => ({ ...each, hidden: false }))
  );

  const toggleHiddenBand = (bandToToggle: AnomalyBand) => {
    setBands((currentBands) =>
      currentBands.map((band) => ({
        ...band,
        hidden: bandsAreEqual(bandToToggle, band) ? !band.hidden : band.hidden,
      }))
    );
  };

  return {
    bands,
    toggleHiddenBand,
  };
};
