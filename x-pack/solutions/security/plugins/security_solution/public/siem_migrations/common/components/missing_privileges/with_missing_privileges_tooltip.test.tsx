/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { WithMissingPrivilegesTooltip } from './with_missing_privileges_tooltip';
import { render, fireEvent, waitFor } from '@testing-library/react';
import type { SiemMigrationsService } from '../../../service';

const mockedMissingCapabilities = [
  {
    capability: 'test_capability',
    description: 'Test capability description',
  },
];

const mockSiemMigrationsService = {
  rules: {
    getMissingCapabilities: jest.fn(),
  },
} as unknown as jest.MockedObjectDeep<SiemMigrationsService>;

const TestComponent = ({ isAuthorized }: { isAuthorized: boolean }) => {
  return <EuiButton isDisabled={!isAuthorized} data-test-subj="test-component" />;
};

const TestcomponentWithTooltip = WithMissingPrivilegesTooltip(
  TestComponent,
  mockSiemMigrationsService.rules,
  'all'
);

const renderTestComponent = () => {
  return render(<TestcomponentWithTooltip />);
};

describe('WithMissingPrivileges Tooltip', () => {
  beforeEach(() => {
    mockSiemMigrationsService.rules.getMissingCapabilities.mockReturnValue(
      mockedMissingCapabilities
    );
  });
  it('renders the component without tooltip when no missing capabilities', () => {
    mockSiemMigrationsService.rules.getMissingCapabilities.mockReturnValue([]);
    const { getByTestId, queryByTestId } = renderTestComponent();
    expect(getByTestId('test-component')).toBeInTheDocument();
    expect(getByTestId('test-component')).not.toBeDisabled();
    expect(queryByTestId('missingPrivilegesTooltipAnchor')).not.toBeInTheDocument();
  });

  it('renders the component with tooltip when there are missing capabilities', async () => {
    const { getByTestId, queryByTestId } = renderTestComponent();
    expect(getByTestId('test-component')).toBeInTheDocument();
    expect(getByTestId('test-component')).toBeDisabled();
    expect(queryByTestId('missingPrivilegesTooltipAnchor')).toBeInTheDocument();
    fireEvent.mouseOver(getByTestId('test-component'));
    await waitFor(() => {
      expect(getByTestId('missingPrivilegesTooltip')).toBeVisible();
      expect(getByTestId('missingPrivilegesTooltip')).toHaveTextContent(
        'Test capability description'
      );
    });
  });
});
