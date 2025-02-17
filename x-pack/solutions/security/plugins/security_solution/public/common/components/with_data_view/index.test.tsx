/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { render, screen } from '@testing-library/react';
import { withDataView } from '.';
import { TestProvidersComponent } from '../../mock';
import { useFullDataView } from '../../../data_view_picker/hooks/use_full_data_view';

jest.mock('../../../data_view_picker/hooks/use_full_data_view');

interface TestComponentProps {
  dataView: DataView;
}

const TEST_ID = {
  DATA_VIEW_ERROR_COMPONENT: 'dataViewErrorComponent',
  TEST_COMPONENT: 'test_component',
  FALLBACK_COMPONENT: 'fallback_component',
};

const FallbackComponent: React.FC = () => <div data-test-subj={TEST_ID.FALLBACK_COMPONENT} />;

const dataViewMockFn = jest.fn();

const TestComponent = (props: TestComponentProps) => {
  useEffect(() => {
    dataViewMockFn(props.dataView);
  }, [props.dataView]);
  return <div data-test-subj={TEST_ID.TEST_COMPONENT} />;
};

describe('withDataViewId', () => {
  describe('when data view is null', () => {
    beforeEach(() => {});

    it('should render provided fallback', async () => {
      const RenderedComponent = withDataView(TestComponent, <FallbackComponent />);
      render(<RenderedComponent />, { wrapper: TestProvidersComponent });
      expect(screen.getByTestId(TEST_ID.FALLBACK_COMPONENT)).toBeVisible();
    });

    it('should render default error components when there is not fallback provided', async () => {
      const RenderedComponent = withDataView(TestComponent);
      render(<RenderedComponent />, { wrapper: TestProvidersComponent });
      expect(screen.getByTestId(TEST_ID.DATA_VIEW_ERROR_COMPONENT)).toBeVisible();
    });
  });

  describe('when data view is set', () => {
    beforeEach(() => {
      jest
        .mocked(useFullDataView)
        .mockImplementation(
          jest.requireActual('../../../data_view_picker/hooks/use_full_data_view').useFullDataView
        );
    });

    it('should render provided component when dataViewId is not null', async () => {
      const RenderedComponent = withDataView(TestComponent);
      render(<RenderedComponent />, { wrapper: TestProvidersComponent });
      expect(screen.getByTestId(TEST_ID.TEST_COMPONENT)).toBeVisible();
      expect(dataViewMockFn).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'security-solution-default' })
      );
    });
  });
});
