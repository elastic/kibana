/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { render } from '@testing-library/react';
import { EuiButtonIcon } from '@elastic/eui';
import { useIndicatorsFiltersContext } from '../../indicators/hooks/use_filters_context';
import { generateMockIndicator, Indicator } from '../../../../common/types/indicator';
import { mockIndicatorsFiltersContext } from '../../../mocks/mock_indicators_filters_context';
import {
  FilterOutButtonEmpty,
  FilterOutButtonIcon,
  FilterOutCellAction,
  FilterOutContextMenu,
} from './filter_out';
import { TestProvidersComponent } from '../../../mocks/test_providers';

jest.mock('../../indicators/hooks/use_filters_context');

const mockIndicator: Indicator = generateMockIndicator();
const mockField: string = 'threat.feed.name';
const TEST_ID: string = 'test';
const CHILD_COMPONENT_TEST_ID: string = 'component-test';

describe('<FilterOutButtonIcon /> <FilterOutButtonEmpty /> <FilterOutContextMenu /> <FilterOutDataGrid />', () => {
  beforeEach(() => {
    (
      useIndicatorsFiltersContext as jest.MockedFunction<typeof useIndicatorsFiltersContext>
    ).mockReturnValue(mockIndicatorsFiltersContext);
  });

  it('should render an empty component (wrong data input)', () => {
    const { container } = render(<FilterOutButtonIcon data={''} field={mockField} />, {
      wrapper: TestProvidersComponent,
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('should render an empty component (wrong field input)', () => {
    const { container } = render(<FilterOutButtonIcon data={mockIndicator} field={''} />, {
      wrapper: TestProvidersComponent,
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('should render one EuiButtonIcon', () => {
    const { getByTestId } = render(
      <FilterOutButtonIcon data={mockIndicator} field={mockField} data-test-subj={TEST_ID} />,
      {
        wrapper: TestProvidersComponent,
      }
    );

    expect(getByTestId(TEST_ID)).toHaveClass('euiButtonIcon');
  });

  it('should render one EuiButtonEmpty', () => {
    const { getByTestId } = render(
      <FilterOutButtonEmpty data={mockIndicator} field={mockField} data-test-subj={TEST_ID} />,
      {
        wrapper: TestProvidersComponent,
      }
    );

    expect(getByTestId(TEST_ID)).toHaveClass('euiButtonEmpty');
  });

  it('should render one EuiContextMenuItem (for EuiContextMenu use)', () => {
    const { getByTestId } = render(
      <FilterOutContextMenu data={mockIndicator} field={mockField} data-test-subj={TEST_ID} />,
      {
        wrapper: TestProvidersComponent,
      }
    );

    expect(getByTestId(TEST_ID)).toHaveClass('euiContextMenuItem');
  });

  it('should render one Component (for EuiDataGrid use)', () => {
    const mockComponent: FunctionComponent = () => (
      <EuiButtonIcon
        aria-label={'test'}
        iconType="plusInCircle"
        data-test-subj={CHILD_COMPONENT_TEST_ID}
      />
    );

    const { getByTestId } = render(
      <FilterOutCellAction
        data={mockIndicator}
        field={mockField}
        Component={mockComponent}
        data-test-subj={TEST_ID}
      />,
      {
        wrapper: TestProvidersComponent,
      }
    );

    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getByTestId(CHILD_COMPONENT_TEST_ID)).toBeInTheDocument();
  });
});
