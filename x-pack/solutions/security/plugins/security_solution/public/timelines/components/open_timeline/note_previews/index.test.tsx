/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { cloneDeep } from 'lodash/fp';
import moment from 'moment';
import { mountWithI18nProvider } from '@kbn/test-jest-helpers';
import { fireEvent, screen, render } from '@testing-library/react';
import React from 'react';
import '../../../../common/mock/formatted_relative';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { mockTimelineResults } from '../../../../common/mock/timeline_results';
import { createReactQueryWrapper, TestProviders } from '../../../../common/mock';
import type { OpenTimelineResult, TimelineResultNote } from '../types';
import { NotePreviews } from '.';
import { useDeleteNote } from './hooks/use_delete_note';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { withIndices } from '../../../../data_view_manager/hooks/__mocks__/use_data_view';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DocumentDetailsRightPanelKey } from '../../../../flyout/document_details/shared/constants/panel_keys';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../flyout_v2/use_flyout_api.mock';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';

const mockDispatch = vi.fn();

vi.mock('../../../../common/lib/kibana');
vi.mock('../../../../common/hooks/use_selector');
vi.mock('../../../../data_view_manager/hooks/use_selected_patterns');
vi.mock('../../../../data_view_manager/hooks/use_data_view');
vi.mock('@kbn/expandable-flyout');
vi.mock('../../../../flyout_v2/use_flyout_api');
vi.mock('../../../../common/hooks/use_is_new_flyout_enabled');

vi.mock('react-redux-v7', () => {
  const original = require('react-redux-v7');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

vi.mock('./hooks/use_delete_note');

vi.mock('../../../../common/components/user_privileges');

const deleteMutateMock = vi.fn();

describe('NotePreviews', () => {
  let mockResults: OpenTimelineResult[];
  let note1updated: number;
  let note2updated: number;
  let note3updated: number;
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
    note1updated = moment('2019-03-24T04:12:33.000Z').valueOf();
    note2updated = moment(note1updated).add(1, 'minute').valueOf();
    note3updated = moment(note2updated).add(1, 'minute').valueOf();
    (useDeepEqualSelector as Mock).mockReset();
    (useDeleteNote as Mock).mockReturnValue({
      mutate: deleteMutateMock,
      onSuccess: vi.fn(),
      onError: vi.fn(),
      isLoading: false,
    });
    (useUserPrivileges as Mock).mockReturnValue({
      notesPrivileges: {
        crud: true,
      },
    });
    (useSelectedPatterns as Mock).mockReturnValue(['test1', 'test2']);
    vi.mocked(useDataView).mockReturnValue(withIndices(['test1', 'test2']));
    (useExpandableFlyoutApi as Mock).mockReturnValue({ openFlyout: vi.fn() });
    flyoutApi = createFlyoutApiMock();
    vi.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
  });

  test('it renders a note preview for each note when isModal is false', () => {
    const hasNotes: OpenTimelineResult[] = [{ ...mockResults[0] }];

    const wrapper = mountWithI18nProvider(<NotePreviews notes={hasNotes[0].notes} />, {
      wrappingComponent: createReactQueryWrapper(),
    });

    hasNotes[0].notes?.forEach(({ savedObjectId }) => {
      expect(wrapper.find(`[data-test-subj="note-preview-${savedObjectId}"]`).exists()).toBe(true);
    });
  });

  test('it renders a note preview for each note when isModal is true', () => {
    const hasNotes: OpenTimelineResult[] = [{ ...mockResults[0] }];

    const wrapper = mountWithI18nProvider(<NotePreviews notes={hasNotes[0].notes} />, {
      wrappingComponent: createReactQueryWrapper(),
    });

    hasNotes[0].notes?.forEach(({ savedObjectId }) => {
      expect(wrapper.find(`[data-test-subj="note-preview-${savedObjectId}"]`).exists()).toBe(true);
    });
  });

  test('it filters-out non-unique savedObjectIds', () => {
    const nonUniqueNotes: TimelineResultNote[] = [
      {
        note: '1',
        savedObjectId: 'noteId1',
        updated: note1updated,
        updatedBy: 'alice',
      },
      {
        note: '2 (savedObjectId is the same as the previous entry)',
        savedObjectId: 'noteId1',
        updated: note2updated,
        updatedBy: 'alice',
      },
      {
        note: '3',
        savedObjectId: 'noteId2',
        updated: note3updated,
        updatedBy: 'bob',
      },
    ];

    const wrapper = mountWithI18nProvider(<NotePreviews notes={nonUniqueNotes} />, {
      wrappingComponent: createReactQueryWrapper(),
    });

    expect(wrapper.find('div.euiCommentEvent__headerUsername').at(1).text()).toEqual('bob');
  });

  test('it filters-out null savedObjectIds', () => {
    const nonUniqueNotes: TimelineResultNote[] = [
      {
        note: '1',
        savedObjectId: 'noteId1',
        updated: note1updated,
        updatedBy: 'alice',
      },
      {
        note: '2 (savedObjectId is null)',
        savedObjectId: null,
        updated: note2updated,
        updatedBy: 'alice',
      },
      {
        note: '3',
        savedObjectId: 'noteId2',
        updated: note3updated,
        updatedBy: 'bob',
      },
    ];

    const wrapper = mountWithI18nProvider(<NotePreviews notes={nonUniqueNotes} />, {
      wrappingComponent: createReactQueryWrapper(),
    });

    expect(wrapper.find('div.euiCommentEvent__headerUsername').at(2).text()).toEqual('bob');
  });

  test('it filters-out undefined savedObjectIds', () => {
    const nonUniqueNotes: TimelineResultNote[] = [
      {
        note: '1',
        savedObjectId: 'noteId1',
        updated: note1updated,
        updatedBy: 'alice',
      },
      {
        note: 'b (savedObjectId is undefined)',
        updated: note2updated,
        updatedBy: 'alice',
      },
      {
        note: 'c',
        savedObjectId: 'noteId2',
        updated: note3updated,
        updatedBy: 'bob',
      },
    ];

    const wrapper = mountWithI18nProvider(<NotePreviews notes={nonUniqueNotes} />, {
      wrappingComponent: createReactQueryWrapper(),
    });

    expect(wrapper.find('div.euiCommentEvent__headerUsername').at(2).text()).toEqual('bob');
  });

  test('it renders timeline description as a note when showTimelineDescription is true and timelineId is defined', () => {
    const timeline = mockTimelineResults[0];
    (useDeepEqualSelector as Mock).mockReturnValue(timeline);

    const wrapper = mountWithI18nProvider(
      <NotePreviews notes={[]} showTimelineDescription timelineId="test-timeline-id" />,
      {
        wrappingComponent: createReactQueryWrapper(),
      }
    );

    expect(wrapper.find('[data-test-subj="note-preview-description"]').first().text()).toContain(
      timeline.description
    );
  });

  test('it does`t render timeline description as a note when it is undefined', () => {
    const timeline = mockTimelineResults[0];
    (useDeepEqualSelector as Mock).mockReturnValue({ ...timeline, description: undefined });

    const wrapper = mountWithI18nProvider(<NotePreviews notes={[]} />, {
      wrappingComponent: createReactQueryWrapper(),
    });

    expect(wrapper.find('[data-test-subj="note-preview-description"]').exists()).toBe(false);
  });

  test('it should disable the delete note button if the savedObjectId is falsy', () => {
    const timeline = mockTimelineResults[0];
    (useDeepEqualSelector as Mock).mockReturnValue(timeline);

    const wrapper = mountWithI18nProvider(
      <NotePreviews
        notes={[
          {
            note: 'disabled delete',
            updated: note2updated,
            updatedBy: 'alice',
          },
        ]}
        showTimelineDescription
        timelineId="test-timeline-id"
      />,
      {
        wrappingComponent: createReactQueryWrapper(),
      }
    );

    expect(wrapper.find('[data-test-subj="delete-note"] button').prop('disabled')).toBeTruthy();
  });

  test('it should enable the delete button if the savedObjectId exists', () => {
    const timeline = mockTimelineResults[0];
    (useDeepEqualSelector as Mock).mockReturnValue(timeline);

    const wrapper = mountWithI18nProvider(
      <NotePreviews
        notes={[
          {
            note: 'enabled delete',
            savedObjectId: 'test-id',
            updated: note2updated,
            updatedBy: 'alice',
          },
        ]}
        showTimelineDescription
        timelineId="test-timeline-id"
      />,
      {
        wrappingComponent: createReactQueryWrapper(),
      }
    );

    expect(wrapper.find('[data-test-subj="delete-note"] button').prop('disabled')).toBeFalsy();
  });

  test('should render toggle event details action by default', () => {
    const timeline = mockTimelineResults[0];
    (useDeepEqualSelector as Mock).mockReturnValue(timeline);

    const wrapper = mountWithI18nProvider(
      <TestProviders>
        <NotePreviews
          notes={[
            {
              noteId: 'noteId1',
              note: 'enabled delete',
              savedObjectId: 'test-id',
              updated: note2updated,
              updatedBy: 'alice',
            },
          ]}
          showTimelineDescription
          timelineId="test-timeline-id"
        />
      </TestProviders>,
      {
        wrappingComponent: createReactQueryWrapper(),
      }
    );

    expect(wrapper.find(`[data-test-subj="notes-toggle-event-details"]`).exists()).toBeTruthy();
  });

  test('should not render toggle event details action when showToggleEventDetailsAction is false ', () => {
    const timeline = mockTimelineResults[0];
    (useDeepEqualSelector as Mock).mockReturnValue(timeline);

    const wrapper = mountWithI18nProvider(
      <TestProviders>
        <NotePreviews
          notes={[
            {
              noteId: 'noteId1',
              note: 'enabled delete',
              savedObjectId: 'test-id',
              updated: note2updated,
              updatedBy: 'alice',
            },
          ]}
          showTimelineDescription
          timelineId="test-timeline-id"
          showToggleEventDetailsAction={false}
        />
      </TestProviders>,
      {
        wrappingComponent: createReactQueryWrapper(),
      }
    );

    expect(wrapper.find(`[data-test-subj="notes-toggle-event-details"]`).exists()).toBeFalsy();
  });

  describe('Toggle event details', () => {
    const renderWithNote = () => {
      const timeline = mockTimelineResults[0];
      (useDeepEqualSelector as Mock).mockReturnValue(timeline);

      return render(
        <TestProviders>
          <NotePreviews
            notes={[
              {
                noteId: 'noteId1',
                note: 'a note',
                savedObjectId: 'test-id',
                updated: note2updated,
                updatedBy: 'alice',
              },
            ]}
            showTimelineDescription
            timelineId="test-timeline-id"
          />
        </TestProviders>,
        {
          wrapper: createReactQueryWrapper(),
        }
      );
    };

    it('should open the legacy expandable flyout when the new flyout is disabled', () => {
      const openFlyout = vi.fn();
      (useExpandableFlyoutApi as Mock).mockReturnValue({ openFlyout });

      const { getByTestId } = renderWithNote();

      fireEvent.click(getByTestId('notes-toggle-event-details'));

      expect(openFlyout).toHaveBeenCalledWith({
        right: {
          id: DocumentDetailsRightPanelKey,
          params: {
            id: 'event1',
            indexName: 'test1,test2',
            scopeId: 'test-timeline-id',
          },
        },
      });
      expect(flyoutApi.openDocumentFlyoutFromPattern).not.toHaveBeenCalled();
    });

    it('should open the new document flyout (from pattern) when the new flyout is enabled', () => {
      vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

      const { getByTestId } = renderWithNote();

      fireEvent.click(getByTestId('notes-toggle-event-details'));

      expect(flyoutApi.openDocumentFlyoutFromPattern).toHaveBeenCalledWith({
        documentId: 'event1',
        indexName: 'test1,test2',
        origin: FLYOUT_ORIGIN.NOTE_PREVIEW,
      });
    });
  });

  describe('Delete Notes', () => {
    it('should dispatch correct action on delete', async () => {
      const timeline = {
        ...mockTimelineResults[0],
      };
      (useDeepEqualSelector as Mock).mockReturnValue(timeline);

      render(
        <TestProviders>
          <NotePreviews
            notes={[
              {
                note: 'first note',
                noteId: 'noteId1',
                savedObjectId: 'test-id-1',
                updated: note2updated,
                updatedBy: 'alice',
              },

              {
                note: 'second note',
                noteId: 'noteId2',
                savedObjectId: 'test-id-2',
                updated: note2updated,
                updatedBy: 'alice',
              },
            ]}
            showTimelineDescription
            timelineId="test-timeline-id"
          />
        </TestProviders>,
        {
          wrapper: createReactQueryWrapper(),
        }
      );

      fireEvent.click(screen.queryAllByTestId('delete-note')[0]);
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notes/userSelectedNotesForDeletion',
          payload: 'noteId1',
        })
      );
    });
  });

  describe('Insuffiecient privileges', () => {
    it('should not show the delete note button', () => {
      (useUserPrivileges as Mock).mockReturnValue({
        notesPrivileges: {
          crud: false,
        },
      });

      const timeline = mockTimelineResults[0];
      (useDeepEqualSelector as Mock).mockReturnValue(timeline);

      const wrapper = mountWithI18nProvider(
        <NotePreviews
          notes={[
            {
              note: 'enabled delete',
              savedObjectId: 'test-id',
              updated: note2updated,
              updatedBy: 'alice',
            },
          ]}
          showTimelineDescription
          timelineId="test-timeline-id"
        />,
        {
          wrappingComponent: createReactQueryWrapper(),
        }
      );

      expect(wrapper.find('[data-test-subj="delete-note"]').exists()).toBe(false);
    });
  });
});
