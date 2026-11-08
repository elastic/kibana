/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { SavedView } from '../../../../../common/saved_views';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { useSavedViews } from '../../../../hooks/use_saved_views';
import { useApplyView, useCurrentView } from '../../../../hooks/use_view_state';
import { SavedViewsMenu } from './saved_views_menu';

jest.mock('../../../../hooks/use_kibana_services');
jest.mock('../../../../hooks/use_view_state');
jest.mock('../../../../hooks/use_saved_views', () => ({
  ...jest.requireActual('../../../../hooks/use_saved_views'),
  useSavedViews: jest.fn(),
}));

const SAFARI: SavedView = { id: 'a', name: 'Safari', description: 'Safari page loads' };
const CHECKOUT: SavedView = {
  id: 'b',
  name: 'checkout',
  filters: '!((meta:()))',
  rangeFrom: 'now-7d',
  rangeTo: 'now',
};

const create = jest.fn();
const update = jest.fn();
const remove = jest.fn();
const applyView = jest.fn();

const CURRENT = {
  state: { filters: '!((current))', kuery: 'a: b', percentile: '95' as const },
  timeRange: { rangeFrom: 'now-15m', rangeTo: 'now' },
};

const mockViews = ({
  views = [SAFARI, CHECKOUT],
  isLoading = false,
  error,
  canSave = true,
}: { views?: SavedView[]; isLoading?: boolean; error?: Error; canSave?: boolean } = {}) => {
  jest.mocked(useKibanaServices).mockReturnValue({
    application: { capabilities: { digital_experience: { save: canSave } } },
  } as unknown as ReturnType<typeof useKibanaServices>);
  jest.mocked(useSavedViews).mockReturnValue({
    views,
    isLoading,
    error,
    refresh: jest.fn(),
    create,
    update,
    remove,
  });
};

const open = async () => {
  render(<SavedViewsMenu />, { wrapper: EuiProvider });
  fireEvent.click(screen.getByTestId('digitalExperienceOverviewSavedViews'));
  return screen.findByTestId('digitalExperienceSavedViewsPanel');
};

beforeEach(() => {
  jest.resetAllMocks();
  create.mockResolvedValue(SAFARI);
  update.mockResolvedValue(SAFARI);
  remove.mockResolvedValue(undefined);
  jest.mocked(useCurrentView).mockReturnValue(CURRENT);
  jest.mocked(useApplyView).mockReturnValue(applyView);
  mockViews();
});

describe('SavedViewsMenu', () => {
  it('reads the views only when it opens', async () => {
    render(<SavedViewsMenu />, { wrapper: EuiProvider });
    expect(useSavedViews).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('digitalExperienceOverviewSavedViews'));

    expect(await screen.findByTestId('digitalExperienceSavedViewsPanel')).toBeInTheDocument();
    expect(useSavedViews).toHaveBeenCalled();
  });

  it('lists the views by name', async () => {
    await open();

    expect(screen.getByTestId('digitalExperienceSavedViewApply-Safari')).toHaveTextContent(
      'Safari'
    );
    expect(screen.getByTestId('digitalExperienceSavedViewApply-checkout')).toBeInTheDocument();
  });

  it('applies a view and closes', async () => {
    await open();

    fireEvent.click(screen.getByTestId('digitalExperienceSavedViewApply-checkout'));

    expect(applyView).toHaveBeenCalledWith(CHECKOUT);
    await waitFor(() =>
      expect(screen.queryByTestId('digitalExperienceSavedViewsPanel')).not.toBeInTheDocument()
    );
  });

  it('says so when there is no view, and when the views could not be read', async () => {
    mockViews({ views: [] });
    const { unmount } = render(<SavedViewsMenu />, { wrapper: EuiProvider });
    fireEvent.click(screen.getByTestId('digitalExperienceOverviewSavedViews'));
    expect(await screen.findByTestId('digitalExperienceSavedViewsEmpty')).toBeInTheDocument();
    unmount();

    mockViews({ views: [], error: new Error('nope') });
    render(<SavedViewsMenu />, { wrapper: EuiProvider });
    fireEvent.click(screen.getByTestId('digitalExperienceOverviewSavedViews'));
    expect(await screen.findByTestId('digitalExperienceSavedViewsLoadError')).toBeInTheDocument();
  });

  it('marks the views that also set the time range', async () => {
    await open();

    expect(screen.getAllByTitle('Also sets the time range')).toHaveLength(1);
  });

  describe('with the privilege to save', () => {
    it('saves the Overview as a view: its filters, query and percentile, without the time range', async () => {
      await open();

      fireEvent.change(screen.getByTestId('digitalExperienceSavedViewName'), {
        target: { value: '  iPhone  ' },
      });
      fireEvent.click(screen.getByTestId('digitalExperienceSavedViewSave'));

      await waitFor(() =>
        expect(create).toHaveBeenCalledWith({
          name: 'iPhone',
          filters: '!((current))',
          kuery: 'a: b',
          percentile: '95',
        })
      );
      await waitFor(() =>
        expect(screen.getByTestId('digitalExperienceSavedViewName')).toHaveValue('')
      );
    });

    it('keeps the time range too when asked', async () => {
      await open();

      fireEvent.change(screen.getByTestId('digitalExperienceSavedViewName'), {
        target: { value: 'last 15 minutes' },
      });
      fireEvent.click(screen.getByTestId('digitalExperienceSavedViewKeepTime'));
      fireEvent.click(screen.getByTestId('digitalExperienceSavedViewSave'));

      await waitFor(() =>
        expect(create).toHaveBeenCalledWith(
          expect.objectContaining({ rangeFrom: 'now-15m', rangeTo: 'now' })
        )
      );
    });

    it('saves nothing without a name', async () => {
      await open();

      expect(screen.getByTestId('digitalExperienceSavedViewSave')).toBeDisabled();
      fireEvent.change(screen.getByTestId('digitalExperienceSavedViewName'), {
        target: { value: '   ' },
      });
      expect(screen.getByTestId('digitalExperienceSavedViewSave')).toBeDisabled();
    });

    it('shows why a save failed, e.g. a name that is taken, and keeps the name', async () => {
      create.mockRejectedValue(
        Object.assign(new Error('Conflict'), { body: { message: 'A view named [Safari] exists' } })
      );
      await open();

      fireEvent.change(screen.getByTestId('digitalExperienceSavedViewName'), {
        target: { value: 'Safari' },
      });
      fireEvent.click(screen.getByTestId('digitalExperienceSavedViewSave'));

      expect(await screen.findByTestId('digitalExperienceSavedViewError')).toHaveTextContent(
        'A view named [Safari] exists'
      );
      expect(screen.getByTestId('digitalExperienceSavedViewName')).toHaveValue('Safari');
    });

    it('saves a view again with the current filters, keeping its name and what it keeps of the time', async () => {
      await open();

      fireEvent.click(screen.getByTestId('digitalExperienceSavedViewUpdate-Safari'));
      await waitFor(() =>
        expect(update).toHaveBeenLastCalledWith('a', {
          name: 'Safari',
          description: 'Safari page loads',
          ...CURRENT.state,
        })
      );

      fireEvent.click(screen.getByTestId('digitalExperienceSavedViewUpdate-checkout'));
      await waitFor(() =>
        expect(update).toHaveBeenLastCalledWith('b', {
          name: 'checkout',
          description: undefined,
          ...CURRENT.state,
          ...CURRENT.timeRange,
        })
      );
    });

    it('asks before it deletes a view, and deletes it when asked', async () => {
      await open();

      fireEvent.click(screen.getByTestId('digitalExperienceSavedViewDelete-Safari'));
      expect(remove).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTestId('digitalExperienceSavedViewConfirmDelete-Safari'));

      await waitFor(() => expect(remove).toHaveBeenCalledWith('a'));
    });

    it('keeps the view when the deletion is cancelled', async () => {
      await open();

      fireEvent.click(screen.getByTestId('digitalExperienceSavedViewDelete-Safari'));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(remove).not.toHaveBeenCalled();
      expect(screen.getByTestId('digitalExperienceSavedViewDelete-Safari')).toBeInTheDocument();
    });
  });

  describe('without the privilege to save', () => {
    it('lists and applies the views, and offers no way to change them', async () => {
      mockViews({ canSave: false });
      await open();

      expect(screen.getByTestId('digitalExperienceSavedViewApply-Safari')).toBeInTheDocument();
      expect(screen.queryByTestId('digitalExperienceSavedViewName')).not.toBeInTheDocument();
      expect(screen.queryByTestId('digitalExperienceSavedViewSave')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('digitalExperienceSavedViewUpdate-Safari')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('digitalExperienceSavedViewDelete-Safari')
      ).not.toBeInTheDocument();
    });
  });
});
