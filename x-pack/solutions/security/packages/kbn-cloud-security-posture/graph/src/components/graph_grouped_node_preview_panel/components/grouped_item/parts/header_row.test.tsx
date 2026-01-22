/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { DOCUMENT_TYPE_ENTITY } from '@kbn/cloud-security-posture-common/schema/graph/v1';
import {
  GROUPED_ITEM_TITLE_TEST_ID_LINK,
  GROUPED_ITEM_TITLE_TEST_ID_TEXT,
  GROUPED_ITEM_TITLE_TOOLTIP_TEST_ID,
} from '../../../test_ids';
import { HeaderRow } from './header_row';
import type { EntityItem } from '../types';
import { createFilterStore, destroyFilterStore } from '../../../../filters/filter_state';

const mockOpenPreviewPanel = jest.fn();

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({
    openPreviewPanel: mockOpenPreviewPanel,
  }),
}));

const flushMicrotasks = () => new Promise((r) => setTimeout(r, 0));

const TEST_SCOPE_ID = 'test-scope-id';

describe('<HeaderRow />', () => {
  beforeEach(() => {
    createFilterStore(TEST_SCOPE_ID, 'test-data-view-id');
    mockOpenPreviewPanel.mockClear();
  });

  afterEach(() => {
    destroyFilterStore(TEST_SCOPE_ID);
  });

  describe('enriched entities', () => {
    it('renders EuiLink (button) for enriched entity', () => {
      const item: EntityItem = {
        itemType: DOCUMENT_TYPE_ENTITY,
        id: 'entity-1',
        label: 'Entity One',
        availableInEntityStore: true,
      };

      const { getByTestId } = render(<HeaderRow scopeId={TEST_SCOPE_ID} item={item} />);
      const element = getByTestId(GROUPED_ITEM_TITLE_TEST_ID_LINK);
      expect(element).toBeInTheDocument();
    });

    it('calls openPreviewPanel for a single click on enriched entity', async () => {
      const item: EntityItem = {
        itemType: DOCUMENT_TYPE_ENTITY,
        id: 'entity-1',
        label: 'Entity One',
        availableInEntityStore: true,
      };

      const { getByTestId } = render(<HeaderRow scopeId={TEST_SCOPE_ID} item={item} />);

      fireEvent.click(getByTestId(GROUPED_ITEM_TITLE_TEST_ID_LINK));
      await flushMicrotasks();

      expect(mockOpenPreviewPanel).toHaveBeenCalledTimes(1);
      expect(mockOpenPreviewPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ entityId: 'entity-1' }),
        })
      );
    });

    it('calls openPreviewPanel for each click on enriched entity', async () => {
      const item: EntityItem = {
        itemType: DOCUMENT_TYPE_ENTITY,
        id: 'entity-dup',
        label: 'Dup',
        availableInEntityStore: true,
      };

      const { getByTestId } = render(<HeaderRow scopeId={TEST_SCOPE_ID} item={item} />);

      const link = getByTestId(GROUPED_ITEM_TITLE_TEST_ID_LINK);
      Array.from({ length: 3 }).forEach(() => fireEvent.click(link));
      await flushMicrotasks();

      expect(mockOpenPreviewPanel).toHaveBeenCalledTimes(3);
    });
  });

  describe('non-enriched entities', () => {
    it('renders EuiText for non-enriched entity and shows tooltip on hover', async () => {
      const item: EntityItem = {
        itemType: DOCUMENT_TYPE_ENTITY,
        id: 'entity-2',
        label: 'Entity Two',
        availableInEntityStore: false,
      };

      const { getByTestId, queryByTestId } = render(
        <HeaderRow scopeId={TEST_SCOPE_ID} item={item} />
      );
      const element = getByTestId(GROUPED_ITEM_TITLE_TEST_ID_TEXT);
      expect(element).toBeInTheDocument();

      // Hover over the text to trigger tooltip
      fireEvent.mouseOver(element);

      // Wait for tooltip to appear
      await waitFor(() => {
        const tooltip = queryByTestId(GROUPED_ITEM_TITLE_TOOLTIP_TEST_ID);
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveTextContent('Entity unavailable in entity store');
      });
    });

    it('does not call openPreviewPanel for non-enriched entity', async () => {
      const item: EntityItem = {
        itemType: DOCUMENT_TYPE_ENTITY,
        id: 'entity-2',
        label: 'Entity Two',
        availableInEntityStore: false,
      };

      const { getByTestId } = render(<HeaderRow scopeId={TEST_SCOPE_ID} item={item} />);

      fireEvent.click(getByTestId(GROUPED_ITEM_TITLE_TEST_ID_TEXT));
      await flushMicrotasks();

      expect(mockOpenPreviewPanel).not.toHaveBeenCalled();
    });

    it('renders EuiText when availableInEntityStore is undefined', () => {
      const item: EntityItem = {
        itemType: DOCUMENT_TYPE_ENTITY,
        id: 'entity-3',
        label: 'Entity Three',
      };

      const { getByTestId } = render(<HeaderRow scopeId={TEST_SCOPE_ID} item={item} />);
      const element = getByTestId(GROUPED_ITEM_TITLE_TEST_ID_TEXT);
      expect(element).toBeInTheDocument();
    });
  });
});
