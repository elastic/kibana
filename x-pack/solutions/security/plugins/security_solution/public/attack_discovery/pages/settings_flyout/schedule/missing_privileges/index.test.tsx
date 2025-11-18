/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EuiFlexItem } from '@elastic/eui';

import { WithMissingPrivileges } from '.';
import { TestProviders } from '../../../../../common/mock';
import { waitForEuiToolTipVisible } from '@elastic/eui/lib/test/rtl';
import { useKibana } from '../../../../../common/lib/kibana';
import { ATTACK_DISCOVERY_FEATURE_ID } from '../../../../../../common/constants';

jest.mock('../../../../../common/lib/kibana');

const renderWithMissingPrivileges = (children: (enabled: boolean) => React.ReactElement) => {
  render(
    <TestProviders>
      <WithMissingPrivileges>{children}</WithMissingPrivileges>
    </TestProviders>
  );
};

describe('WithMissingPrivileges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when enabled update capability', () => {
    beforeEach(() => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          application: {
            capabilities: {
              [ATTACK_DISCOVERY_FEATURE_ID]: {
                updateAttackDiscoverySchedule: true,
              },
            },
          },
        },
      });
    });

    it('should render child component', async () => {
      renderWithMissingPrivileges(() => <EuiFlexItem data-test-subj="testChild1" />);
      await waitFor(() => {
        expect(screen.getByTestId('testChild1')).toBeInTheDocument();
      });
    });

    it('should call children handler with `enabled` set to `true`', async () => {
      renderWithMissingPrivileges((enabled) => {
        expect(enabled).toEqual(true);
        return <EuiFlexItem data-test-subj="testChild1" />;
      });
      await waitFor(() => {
        expect(screen.getByTestId('testChild1')).toBeInTheDocument();
      });
    });

    it('should not render missing privileges tooltip', async () => {
      renderWithMissingPrivileges(() => <EuiFlexItem data-test-subj="testChild1" />);

      expect(screen.queryByTestId('missingPrivilegesTooltip')).not.toBeInTheDocument();
    });
  });

  describe('when disabled update capability', () => {
    beforeEach(() => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          application: {
            capabilities: {
              [ATTACK_DISCOVERY_FEATURE_ID]: {
                updateAttackDiscoverySchedule: false,
              },
            },
          },
        },
      });
    });

    it('should render child component', async () => {
      renderWithMissingPrivileges(() => <EuiFlexItem data-test-subj="testChild1" />);
      await waitFor(() => {
        expect(screen.getByTestId('testChild1')).toBeInTheDocument();
      });
    });

    it('should call children handler with `enabled` set to `false`', async () => {
      renderWithMissingPrivileges((enabled) => {
        expect(enabled).toEqual(false);
        return <EuiFlexItem data-test-subj="testChild1" />;
      });
      await waitFor(() => {
        expect(screen.getByTestId('testChild1')).toBeInTheDocument();
      });
    });

    it('should render missing privileges tooltip', async () => {
      renderWithMissingPrivileges(() => <EuiFlexItem data-test-subj="testChild1" />);

      const chileComponent = screen.getByTestId('testChild1');
      fireEvent.mouseOver(chileComponent.parentElement as Node);
      await waitForEuiToolTipVisible();

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent('Missing privileges');
    });
  });
});
