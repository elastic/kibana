/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { casesPluginMock } from '@kbn/cases-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  generateMockFileIndicator,
  type Indicator,
} from '../../../../../common/threat_intelligence/types/indicator';
import { TestProvidersComponent } from '../../../../threat_intelligence/mocks/test_providers';
import { IndicatorAddToCaseContextMenuItem } from './add_to_case_context_menu_item';

const TEST_ID = 'test';
const indicator: Indicator = generateMockFileIndicator();
const onClick = jest.fn();

const casesServiceMock = casesPluginMock.createStartContract();
const mockCanUseCases = jest.fn();

const getMockedServices = (permissions: object) => ({
  cases: {
    ...casesServiceMock,
    helpers: {
      ...casesServiceMock.helpers,
      canUseCases: mockCanUseCases.mockReturnValue(permissions),
    },
  },
});

const renderWithPermissions = (permissions: object, element: ReactNode) =>
  render(
    <TestProvidersComponent>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <KibanaContextProvider services={getMockedServices(permissions) as any}>
        {element}
      </KibanaContextProvider>
    </TestProvidersComponent>
  );

describe('IndicatorAddToCaseContextMenuItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the singular add-to-case action', () => {
    const { getByTestId, getByText } = render(
      <TestProvidersComponent>
        <IndicatorAddToCaseContextMenuItem
          indicator={indicator}
          onClick={onClick}
          data-test-subj={TEST_ID}
        />
      </TestProvidersComponent>
    );

    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getByText('Add to case')).toBeInTheDocument();
  });

  it('is disabled if the indicator is missing its name', () => {
    const fields = { ...indicator.fields };
    delete fields['threat.indicator.name'];
    const indicatorMissingName = {
      _id: indicator._id,
      fields,
    };
    const { getByTestId } = render(
      <TestProvidersComponent>
        <IndicatorAddToCaseContextMenuItem
          indicator={indicatorMissingName}
          onClick={onClick}
          data-test-subj={TEST_ID}
        />
      </TestProvidersComponent>
    );

    expect(getByTestId(TEST_ID)).toBeDisabled();
  });

  it('is disabled when the user has no createComment permission', () => {
    const { getByTestId } = renderWithPermissions(
      { createComment: false, create: true, update: true },
      <IndicatorAddToCaseContextMenuItem
        indicator={indicator}
        onClick={onClick}
        data-test-subj={TEST_ID}
      />
    );

    expect(getByTestId(TEST_ID)).toBeDisabled();
  });

  it('is disabled when the user has createComment but neither create nor update permission', () => {
    const { getByTestId } = renderWithPermissions(
      { createComment: true, create: false, update: false },
      <IndicatorAddToCaseContextMenuItem
        indicator={indicator}
        onClick={onClick}
        data-test-subj={TEST_ID}
      />
    );

    expect(getByTestId(TEST_ID)).toBeDisabled();
  });
});
