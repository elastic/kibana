/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { NotesButton } from '../../../timelines/components/timeline/properties/helpers';
import { type TimelineType, TimelineTypeEnum } from '../../../../common/api/timeline';
import { useUserPrivileges } from '../user_privileges';
import { ActionIconItem } from './action_icon_item';

const NOTES_DISABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.timeline.body.notes.disableEventTooltip',
  {
    defaultMessage: 'Notes cannot be added here while editing a template Timeline.',
  }
);
const NOTES_ADD_TOOLTIP = i18n.translate(
  'xpack.securitySolution.timeline.body.notes.addNoteTooltip',
  {
    defaultMessage: 'Add note',
  }
);
const NO_NOTES_TOOLTIP = i18n.translate(
  'xpack.securitySolution.timeline.body.notes.addNoteTooltip',
  {
    defaultMessage: 'No notes available',
  }
);
const ADD_NOTES_COUNT_TOOLTIP = ({ notesCount }: { notesCount: number }) =>
  i18n.translate(
    'xpack.securitySolution.timeline.body.notes.addNote.multipleNotesAvailableTooltip',
    {
      values: { notesCount },
      defaultMessage:
        '{notesCount} {notesCount, plural, one {note} other {notes}  } available. Click to view {notesCount, plural, one {it} other {them}} and add more.',
    }
  );

const VIEW_NOTES_COUNT_TOOLTIP = ({ notesCount }: { notesCount: number }) =>
  i18n.translate(
    'xpack.securitySolution.timeline.body.notes.addNote.multipleNotesAvailableTooltip',
    {
      values: { notesCount },
      defaultMessage:
        '{notesCount} {notesCount, plural, one {note} other {notes}  } available. Click to view {notesCount, plural, one {it} other {them}}.',
    }
  );

interface AddEventNoteActionProps {
  ariaLabel?: string;
  timelineType: TimelineType;
  toggleShowNotes?: () => void | ((eventId: string) => void);
  eventId?: string;
  /*
   * Number of notes associated with the event
   */
  notesCount: number;
}

const AddEventNoteActionComponent: React.FC<AddEventNoteActionProps> = ({
  ariaLabel,
  timelineType,
  toggleShowNotes,
  eventId,
  notesCount,
}) => {
  const {
    notesPrivileges: { crud: canAddNotes, read: canViewNotes },
  } = useUserPrivileges();

  const tooltip = useMemo(() => {
    if (timelineType === TimelineTypeEnum.template) {
      return NOTES_DISABLE_TOOLTIP;
    }
    if (canAddNotes) {
      return notesCount > 0 ? ADD_NOTES_COUNT_TOOLTIP({ notesCount }) : NOTES_ADD_TOOLTIP;
    }
    if (canViewNotes) {
      return notesCount > 0 ? VIEW_NOTES_COUNT_TOOLTIP({ notesCount }) : NO_NOTES_TOOLTIP;
    }

    // we can return an empty string for tooltip because the icon is actually no shown at all
    return '';
  }, [canAddNotes, canViewNotes, notesCount, timelineType]);

  const disabled = useMemo(() => !canAddNotes && notesCount === 0, [canAddNotes, notesCount]);

  return (
    <ActionIconItem>
      <NotesButton
        ariaLabel={ariaLabel}
        data-test-subj="add-note"
        isDisabled={disabled}
        timelineType={timelineType}
        toggleShowNotes={toggleShowNotes}
        toolTip={tooltip}
        eventId={eventId}
        notesCount={notesCount}
      />
    </ActionIconItem>
  );
};

AddEventNoteActionComponent.displayName = 'AddEventNoteActionComponent';

export const AddEventNoteAction = React.memo(AddEventNoteActionComponent);
