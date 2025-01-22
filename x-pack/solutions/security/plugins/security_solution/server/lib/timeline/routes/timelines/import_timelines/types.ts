/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { BulkError } from '../../../../detection_engine/routes/utils';

import type { SavedTimeline, Note } from '../../../../../../common/api/timeline';
import type { TimelineStatusActions } from '../../../utils/common';

export type ImportedTimeline = SavedTimeline & {
  savedObjectId: string | null;
  version: string | null;
  pinnedEventIds: string[];
  globalNotes: Note[];
  eventNotes: Note[];
};

export type PromiseFromStreams = ImportedTimeline;

export interface ImportRegular {
  timeline_id: string;
  status_code: number;
  message?: string;
  action: TimelineStatusActions.createViaImport | TimelineStatusActions.updateViaImport;
}

export type ImportTimelineResponse = ImportRegular | BulkError;
