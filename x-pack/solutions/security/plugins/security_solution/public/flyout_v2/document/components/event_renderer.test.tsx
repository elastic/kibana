/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useEventDetails } from '../../../flyout/document_details/shared/hooks/use_event_details';
import { EventRenderer } from './event_renderer';
import { EVENT_RENDERER_TEST_ID } from './test_ids';
import { TestProviders } from '../../../common/mock';

jest.mock('../../../flyout/document_details/shared/hooks/use_event_details');

const mockUseEventDetails = useEventDetails as jest.Mock;

const createMockHit = (): DataTableRecord =>
  ({
    id: 'test-id',
    raw: { _id: 'test-event-id', _index: 'test-index' },
    flattened: {},
    isAnchor: false,
  } as DataTableRecord);

const mockDataAsNestedObject = {
  _id: 'test-event-id',
  _index: 'test-index',
  // using suricata because it's the simplest to set up
  event: { module: ['suricata'] },
};

const renderEventRenderer = (props: React.ComponentProps<typeof EventRenderer>) =>
  render(
    <TestProviders>
      <EventRenderer {...props} />
    </TestProviders>
  );

describe('<EventRenderer />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when dataAsNestedObject is not provided (new flyout)', () => {
    it('should show skeleton while loading', () => {
      mockUseEventDetails.mockReturnValue({ dataAsNestedObject: null, loading: true });

      renderEventRenderer({ hit: createMockHit() });
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render component when a row renderer is available', () => {
      mockUseEventDetails.mockReturnValue({
        dataAsNestedObject: mockDataAsNestedObject,
        loading: false,
      });

      const { getByTestId } = renderEventRenderer({ hit: createMockHit() });
      expect(getByTestId(EVENT_RENDERER_TEST_ID)).toBeInTheDocument();
    });

    it('should render nothing when no row renderer is available', () => {
      mockUseEventDetails.mockReturnValue({
        dataAsNestedObject: { _id: 'test-event-id', _index: 'test-index' },
        loading: false,
      });

      const { container } = renderEventRenderer({ hit: createMockHit() });
      expect(container).toBeEmptyDOMElement();
    });

    it('should render nothing when dataAsNestedObject is null', () => {
      mockUseEventDetails.mockReturnValue({ dataAsNestedObject: null, loading: false });

      const { container } = renderEventRenderer({ hit: createMockHit() });
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('when dataAsNestedObject is provided (old flyout)', () => {
    it('should skip the fetch and render component when a row renderer is available', () => {
      mockUseEventDetails.mockReturnValue({ dataAsNestedObject: null, loading: false });

      const { getByTestId } = renderEventRenderer({
        hit: createMockHit(),
        dataAsNestedObject: mockDataAsNestedObject,
      });

      expect(mockUseEventDetails).toHaveBeenCalledWith(expect.objectContaining({ skip: true }));
      expect(getByTestId(EVENT_RENDERER_TEST_ID)).toBeInTheDocument();
    });

    it('should not show skeleton even when the hook reports loading', () => {
      mockUseEventDetails.mockReturnValue({ dataAsNestedObject: null, loading: true });

      renderEventRenderer({
        hit: createMockHit(),
        dataAsNestedObject: mockDataAsNestedObject,
      });

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('should render nothing when dataAsNestedObject prop is null', () => {
      mockUseEventDetails.mockReturnValue({ dataAsNestedObject: null, loading: false });

      const { container } = renderEventRenderer({
        hit: createMockHit(),
        dataAsNestedObject: null,
      });

      expect(container).toBeEmptyDOMElement();
    });
  });
});
