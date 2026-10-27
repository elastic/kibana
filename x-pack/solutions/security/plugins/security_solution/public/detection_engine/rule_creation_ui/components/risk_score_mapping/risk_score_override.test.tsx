/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RiskScoreOverride } from './risk_score_override';
import * as i18n from './translations';

describe('RiskScoreOverride', () => {
  const renderComponent = (onToggleMappingChecked = jest.fn()) =>
    render(
      <RiskScoreOverride
        isMappingChecked={false}
        onToggleMappingChecked={onToggleMappingChecked}
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

  it('associates every label with a form control', () => {
    const { container } = renderComponent();

    container.querySelectorAll('label').forEach((label) => {
      expect(label.control).not.toBeNull();
    });
  });

  it('toggles the override when its label is clicked', () => {
    const onToggleMappingChecked = jest.fn();
    renderComponent(onToggleMappingChecked);

    fireEvent.click(screen.getByText(i18n.RISK_SCORE_MAPPING));

    expect(onToggleMappingChecked).toHaveBeenCalledTimes(1);
  });
});
