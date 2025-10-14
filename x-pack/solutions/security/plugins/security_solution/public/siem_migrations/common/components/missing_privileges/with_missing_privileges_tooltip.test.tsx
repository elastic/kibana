/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { WithMissingPrivilegesTooltip } from './with_missing_privileges_tooltip';
import { useKibana } from '../../../../common/lib/kibana';
import { render, fireEvent, waitFor } from '@testing-library/react';
import type { SiemMigrationsService } from '../../../service';
import type { MigrationType } from '../../../../../common/siem_migrations/types';

jest.mock('../../../../common/lib/kibana');
const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

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
  dashboards: {
    getMissingCapabilities: jest.fn(),
  },
} as unknown as jest.MockedObjectDeep<SiemMigrationsService>;

const TestComponent = ({ isAuthorized }: { isAuthorized: boolean }) => {
  return <EuiButton isDisabled={!isAuthorized} data-test-subj="test-component" />;
};

const getTestComponentWithTooltip = (migrationType: MigrationType) =>
  WithMissingPrivilegesTooltip(TestComponent, migrationType, 'all');

const renderTestComponent = (migrationType: MigrationType) => {
  const TestComponentWithTooltip = getTestComponentWithTooltip(migrationType);
  return render(<TestComponentWithTooltip />);
};

describe('WithMissingPrivileges Tooltip', () => {
  beforeEach(() => {
    mockSiemMigrationsService.rules.getMissingCapabilities.mockReturnValue(
      mockedMissingCapabilities
    );
    mockSiemMigrationsService.dashboards.getMissingCapabilities.mockReturnValue(
      mockedMissingCapabilities
    );

    useKibanaMock.mockReturnValue({
      services: {
        siemMigrations: mockSiemMigrationsService,
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  describe('Rules', () => {
    it('renders the component without tooltip when no missing capabilities', () => {
      mockSiemMigrationsService.rules.getMissingCapabilities.mockReturnValue([]);
      const { getByTestId, queryByTestId } = renderTestComponent('rule');
      expect(getByTestId('test-component')).toBeInTheDocument();
      expect(getByTestId('test-component')).not.toBeDisabled();
      expect(queryByTestId('missingPrivilegesTooltipAnchor')).not.toBeInTheDocument();
    });

    it('renders the component with tooltip when there are missing capabilities', async () => {
      const { getByTestId, queryByTestId } = renderTestComponent('rule');
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

  describe('Dashboards', () => {
    it('renders the component without tooltip when no missing capabilities', () => {
      mockSiemMigrationsService.dashboards.getMissingCapabilities.mockReturnValue([]);
      const { getByTestId, queryByTestId } = renderTestComponent('dashboard');
      expect(getByTestId('test-component')).toBeInTheDocument();
      expect(getByTestId('test-component')).not.toBeDisabled();
      expect(queryByTestId('missingPrivilegesTooltipAnchor')).not.toBeInTheDocument();
    });

    it('renders the component with tooltip when there are missing capabilities', async () => {
      const { getByTestId, queryByTestId } = renderTestComponent('dashboard');
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
});
