/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import { TestProviders } from '../../../../../../../common/mock';
import StartDashboardMigrationCard from './start_migration_card';
import * as useUpsellingComponentModule from '../../../../../../../common/hooks/use_upselling';
import { OnboardingCardId } from '../../../../../../constants';
import { render, screen } from '@testing-library/react';

const useUpsellingComponentSpy = jest.spyOn(useUpsellingComponentModule, 'useUpsellingComponent');

const MockUpsellingComponent = () => {
  return <div data-test-subj="mockUpsellSection">{`Start Migrations Upselling Component`}</div>;
};

type TestComponentProps = ComponentProps<typeof StartDashboardMigrationCard>;
const defaultProps: TestComponentProps = {
  setComplete: jest.fn(),
  isCardComplete: jest.fn(
    (cardId: OnboardingCardId) => cardId === OnboardingCardId.siemMigrationsAiConnectors
  ),
  setExpandedCardId: jest.fn(),
  checkComplete: jest.fn(),
  isCardAvailable: () => true,
  checkCompleteMetadata: {
    missingCapabilities: [],
  },
};

const renderTestComponent = (props: Partial<TestComponentProps> = {}) => {
  const finalProps: TestComponentProps = {
    ...defaultProps,
    ...props,
  };

  return render(
    <TestProviders>
      <StartDashboardMigrationCard {...finalProps} />
    </TestProviders>
  );
};

describe('StartDashboardMigrationCard', () => {
  beforeEach(() => {
    useUpsellingComponentSpy.mockReturnValue(null);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should render upsell correctly when available', () => {
    useUpsellingComponentSpy.mockReturnValue(MockUpsellingComponent);

    renderTestComponent();

    expect(screen.getByTestId('mockUpsellSection')).toBeVisible();
    expect(screen.getByTestId('startDashboardMigrationUploadDashboardsButton')).toBeVisible();
    expect(screen.getByTestId('startDashboardMigrationUploadDashboardsButton')).toBeDisabled();
  });

  it('should render missing Privileges Callout when there are missing capabilities but NO Upsell', () => {
    renderTestComponent({
      checkCompleteMetadata: {
        missingCapabilities: ['missingPrivileges'],
      },
    });

    expect(screen.getByTestId('missingPrivilegesGroup')).toBeVisible();
  });

  it('should render component correctly when no upsell and no missing capabilities', () => {
    renderTestComponent();

    expect(screen.getByTestId('startDashboardMigrationsCardBody')).toBeVisible();
    expect(screen.getByTestId('startDashboardMigrationsCardBody')).not.toBeEmptyDOMElement();
  });
});
