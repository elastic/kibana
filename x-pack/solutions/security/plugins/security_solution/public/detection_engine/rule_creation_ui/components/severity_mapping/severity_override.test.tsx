/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SeverityOverride } from './severity_override';
import * as i18n from './translations';

describe('SeverityOverride', () => {
  const renderComponent = () =>
    render(
      <SeverityOverride
        isDisabled={false}
        onSeverityMappingChecked={jest.fn()}
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

  it('describes the override checkbox with its visible description', () => {
    renderComponent();

    expect(
      screen.getByRole('checkbox', { name: i18n.SEVERITY_MAPPING })
    ).toHaveAccessibleDescription(i18n.SEVERITY_MAPPING_DESCRIPTION);
  });
});
