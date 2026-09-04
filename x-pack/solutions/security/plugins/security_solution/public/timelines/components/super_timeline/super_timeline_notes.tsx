/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiAvatar,
  EuiBadge,
  EuiComment,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { getEmptyValue } from '../../../common/components/empty_value';
import { ADDED_A_DESCRIPTION } from '../open_timeline/note_previews/translations';
import { NotesList } from '../../../notes/components/notes_list';
import { unnamedTimeline } from './translations';
import type { Note } from '../../../../common/api/timeline';

export interface SuperTimelineDescription {
  savedObjectId: string;
  title: string;
  description: string;
  updatedBy: string | null | undefined;
  updated: number | null | undefined;
}

interface SuperTimelineNotesProps {
  notes: Note[];
  superTimelineSourceIds: string[];
  superTimelineSourceTitles: string[];
  superTimelineDescriptions: SuperTimelineDescription[];
}

export const SuperTimelineNotes: React.FC<SuperTimelineNotesProps> = ({
  notes,
  superTimelineSourceIds,
  superTimelineSourceTitles,
  superTimelineDescriptions,
}) => {
  const notesByTimeline = useMemo(() => {
    const map = new Map<string, Note[]>(superTimelineSourceIds.map((id) => [id, []]));
    for (const note of notes) {
      const id = note.timelineId ?? '';
      const bucket = map.get(id);
      if (bucket) bucket.push(note);
    }
    return map;
  }, [notes, superTimelineSourceIds]);

  const descriptionByTimelineId = useMemo(
    () => new Map(superTimelineDescriptions.map((d) => [d.savedObjectId, d])),
    [superTimelineDescriptions]
  );

  return (
    <>
      {superTimelineSourceIds.map((id, index) => {
        const title = superTimelineSourceTitles[index] || unnamedTimeline(index);
        const timelineNotes = notesByTimeline.get(id) ?? [];
        const desc = descriptionByTimelineId.get(id);
        const itemCount = timelineNotes.length + (desc ? 1 : 0);

        if (itemCount === 0) return null;

        return (
          <div key={id}>
            <EuiAccordion
              id={`super-timeline-group-${id}`}
              initialIsOpen={true}
              paddingSize="m"
              buttonContent={
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem>
                    <strong>{title}</strong>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{itemCount}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
            >
              <>
                {desc && (
                  <>
                    <EuiComment
                      username={title}
                      timestamp={
                        desc.updated ? (
                          <FormattedRelative value={new Date(desc.updated)} />
                        ) : (
                          getEmptyValue()
                        )
                      }
                      event={ADDED_A_DESCRIPTION}
                      timelineAvatar={<EuiAvatar size="l" name={desc.updatedBy || title} />}
                    >
                      <EuiText size="s">{desc.description}</EuiText>
                    </EuiComment>
                    <EuiSpacer size="s" />
                  </>
                )}
                {timelineNotes.length > 0 && (
                  <NotesList
                    notes={timelineNotes}
                    options={{
                      hideTimelineIcon: true,
                      hideDeleteIcon: true,
                    }}
                  />
                )}
              </>
            </EuiAccordion>
          </div>
        );
      })}
    </>
  );
};

SuperTimelineNotes.displayName = 'SuperTimelineNotes';
