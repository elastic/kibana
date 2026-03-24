/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useDocumentDetailsContext } from '../../shared/context';
import { useTimelineConfig } from '../../shared/hooks/use_timeline_config';
import {
  NotesDetailsContent,
  FETCH_NOTES_ERROR,
  NO_NOTES,
} from '../../../shared/components/notes_details_content';

export { FETCH_NOTES_ERROR, NO_NOTES };

/**
 * List all the notes for a document id and allows to create new notes associated with that document.
 * Displayed in the document details expandable flyout left section.
 */
export const NotesDetails = memo(() => {
  const { eventId, searchHit } = useDocumentDetailsContext();
  const timelineConfig = useTimelineConfig(eventId);

  return (
    <NotesDetailsContent
      documentId={eventId}
      searchHit={searchHit}
      timelineConfig={timelineConfig}
    />
  );
});

NotesDetails.displayName = 'NotesDetails';
