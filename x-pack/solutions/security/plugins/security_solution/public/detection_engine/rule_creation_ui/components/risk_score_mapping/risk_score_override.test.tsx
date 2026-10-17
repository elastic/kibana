/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RiskScoreOverride } from './risk_score_override';
import * as i18n from './translations';

describe('RiskScoreOverride', () => {
  const renderComponent = () =>
    render(
      <RiskScoreOverride
        isMappingChecked={false}
        onToggleMappingChecked={jest.fn()}
        onMappingChange={jest.fn()}
        mapping={[]}
        indices={{ title: '', fields: [] }}
        isDisabled={false}
      />
    );

  it('labels the override checkbox with its visible title', () => {
    renderComponent();

    expect(screen.getByRole('checkbox', { name: i18n.RISK_SCORE_MAPPING })).toBeInTheDocument();
  });

  it('describes the override checkbox with its visible description', () => {
    renderComponent();

    expect(
      screen.getByRole('checkbox', { name: i18n.RISK_SCORE_MAPPING })
    ).toHaveAccessibleDescription(i18n.RISK_SCORE_MAPPING_DESCRIPTION);
  });
});
