/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { getListResponseMock } from '@kbn/lists-plugin/common/schemas/response/list_schema.mock';
import { useDeleteList, useFindLists } from '@kbn/securitysolution-list-hooks';
import { exportList } from '@kbn/securitysolution-list-api';
import type { ListSchema } from '@kbn/securitysolution-io-ts-list-types';

import { TestProviders } from '../../../../common/mock';
import { ValueListsFlyout } from './flyout';

vi.mock('@kbn/securitysolution-list-hooks', async () => {
  const actual = await vi.importActual('@kbn/securitysolution-list-hooks');

  return {
    ...actual,
    useDeleteList: vi.fn(),
    useFindLists: vi.fn(),
  };
});

vi.mock('@kbn/securitysolution-list-api', async () => {
  const actual = await vi.importActual('@kbn/securitysolution-list-api');

  return {
    ...actual,
    exportList: vi.fn(),
  };
});

describe('ValueListsFlyout', () => {
  beforeEach(() => {
    // Do not resolve the export in tests as it causes unexpected state updates
    (exportList as Mock).mockImplementation(() => new Promise(() => {}));
    (useFindLists as Mock).mockReturnValue({
      start: vi.fn(),
      result: { data: Array<ListSchema>(3).fill(getListResponseMock()), total: 3 },
    });
    (useDeleteList as Mock).mockReturnValue({
      start: vi.fn(),
      result: getListResponseMock(),
    });
  });

  it('renders nothing if showFlyout is false', () => {
    const container = mount(
      <TestProviders>
        <ValueListsFlyout showFlyout={false} onClose={vi.fn()} />
      </TestProviders>
    );

    expect(container.find('EuiFlyout')).toHaveLength(0);
  });

  it('renders flyout if showFlyout is true', () => {
    const container = mount(
      <TestProviders>
        <ValueListsFlyout showFlyout={true} onClose={vi.fn()} />
      </TestProviders>
    );

    expect(container.find('EuiFlyout')).toHaveLength(1);
  });

  it('should get value lists sorted desc by created_at', async () => {
    const findListMock = vi.fn();
    (useFindLists as Mock).mockReturnValue({
      start: findListMock,
      result: getListResponseMock(),
    });
    mount(
      <TestProviders>
        <ValueListsFlyout showFlyout={true} onClose={vi.fn()} />
      </TestProviders>
    );

    expect(findListMock).toHaveBeenCalledWith(
      expect.objectContaining({ sortField: 'created_at', sortOrder: 'desc' })
    );
  });
  it('calls onClose when flyout is closed', () => {
    const onClose = vi.fn();
    const container = mount(
      <TestProviders>
        <ValueListsFlyout showFlyout={true} onClose={onClose} />
      </TestProviders>
    );

    container.find('button[data-test-subj="value-lists-flyout-close-action"]').simulate('click');

    expect(onClose).toHaveBeenCalled();
  });

  it('renders ValueListsForm and an EuiTable', () => {
    const container = mount(
      <TestProviders>
        <ValueListsFlyout showFlyout={true} onClose={vi.fn()} />
      </TestProviders>
    );

    expect(container.find('ValueListsForm')).toHaveLength(1);
    expect(container.find('EuiBasicTable')).toHaveLength(1);
  });

  describe('flyout table actions', () => {
    it('calls exportList when export is clicked', async () => {
      const container = mount(
        <TestProviders>
          <ValueListsFlyout showFlyout={true} onClose={vi.fn()} />
        </TestProviders>
      );

      await waitFor(() => {
        container
          .find('button[data-test-subj="action-export-value-list"]')
          .first()
          .simulate('click');
      });

      expect(exportList).toHaveBeenCalledWith(expect.objectContaining({ listId: 'some-list-id' }));
    });

    it('calls deleteList when delete is clicked', async () => {
      const deleteListMock = vi.fn();
      (useDeleteList as Mock).mockReturnValue({
        start: deleteListMock,
        result: getListResponseMock(),
      });
      const container = mount(
        <TestProviders>
          <ValueListsFlyout showFlyout={true} onClose={vi.fn()} />
        </TestProviders>
      );

      await waitFor(() => {
        container
          .find('button[data-test-subj="action-delete-value-list-some name"]')
          .first()
          .simulate('click');
      });

      expect(deleteListMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'some-list-id' }));
    });

    it('should render the first page after importing new file', async () => {
      const findListMock = vi.fn();
      (useFindLists as Mock).mockReturnValue({
        start: findListMock,
        result: { data: Array<ListSchema>(6).fill(getListResponseMock()), total: 6 },
      });
      const container = mount(
        <TestProviders>
          <ValueListsFlyout showFlyout={true} onClose={vi.fn()} />
        </TestProviders>
      );
      await waitFor(() => {
        container.find('a[data-test-subj="pagination-button-1"]').first().simulate('click');
      });

      await waitFor(() => {
        container
          .find('button[data-test-subj="value-lists-form-import-action"]')
          .first()
          .simulate('click');
      });

      expect(findListMock).toHaveBeenCalledWith(expect.objectContaining({ pageIndex: 1 }));
    });
  });
});
