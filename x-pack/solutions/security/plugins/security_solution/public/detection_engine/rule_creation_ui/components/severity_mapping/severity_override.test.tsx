/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SeverityOverride } from './severity_override';
import * as i18n from './translations';

describe('SeverityOverride', () => {
  const renderComponent = (onSeverityMappingChecked = jest.fn()) =>
    render(
      <SeverityOverride
        isDisabled={false}
        onSeverityMappingChecked={onSeverityMappingChecked}
        onFieldChange={jest.fn()}
        onFieldMatchValueChange={jest.fn()}
        isMappingChecked={false}
        mapping={[]}
        indices={{ title: '', fields: [] }}
      />
    );

  it('labels the override checkbox with its visible title', () => {
    renderComponent();

    expect(screen.getByRole('checkbox', { name: i18n.SEVERITY_MAPPING })).toBeInTheDocument();
  });

  it('associates every label with a form control', () => {
    const { container } = renderComponent();

    container.querySelectorAll('label').forEach((label) => {
      expect(label.control).not.toBeNull();
    });
  });

  it('toggles the override when its label is clicked', () => {
    const onSeverityMappingChecked = jest.fn();
    renderComponent(onSeverityMappingChecked);

    fireEvent.click(screen.getByText(i18n.SEVERITY_MAPPING));

    expect(onSeverityMappingChecked).toHaveBeenCalledTimes(1);
  });
});
