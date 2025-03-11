/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';

import { useKibana } from '../../../../../common/lib/kibana';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { appActions } from '../../../../../common/store/app';
import { timelineActions } from '../../../../store';
import { TimelineId } from '../../../../../../common/types/timeline';
import * as i18n from '../translations';

export function useDeleteNote(
  noteId: string | null | undefined,
  eventId: string | null | undefined,
  eventIdToNoteIds?: Record<string, string[]>,
  savedObjectId?: string | null
) {
  const {
    services: { http },
  } = useKibana();
  const dispatch = useDispatch();
  const { addError } = useAppToasts();
  return useMutation({
    mutationFn: (id: string | null | undefined) => {
      return http.fetch('/api/note', {
        method: 'DELETE',
        body: JSON.stringify({ noteId: id }),
        version: '2023-10-31',
      });
    },
    onSuccess: () => {
      const notes = eventIdToNoteIds?.[eventId ?? ''];
      if (savedObjectId) {
        dispatch(
          appActions.deleteNote({
            id: savedObjectId,
          })
        );
      }
      if (noteId && eventId) {
        dispatch(
          timelineActions.deleteNoteFromEvent({
            id: TimelineId.active,
            noteId,
            eventId,
          })
        );
      }
      if (eventId && notes && notes.length === 1) {
        dispatch(
          timelineActions.unPinEvent({
            eventId,
            id: TimelineId.active,
          })
        );
      }
    },
    onError: (err: string) => {
      addError(err, { title: i18n.DELETE_NOTE_ERROR(err) });
    },
  });
}
