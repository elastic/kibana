/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ColumnHeaderOptions, SortColumnTimeline } from '../../../common/types';
import type { RowRendererId } from '../../../common/api/timeline';

import type { TimelineModel } from './model';

/** A map of id to timeline  */
export interface TimelineById {
  [id: string]: TimelineModel;
}

export interface InsertTimeline {
  graphEventId?: string;
  timelineId: string;
  timelineSavedObjectId: string | null;
  timelineTitle: string;
}

export const EMPTY_TIMELINE_BY_ID: TimelineById = {}; // stable reference

/** The state of all timelines is stored here */
export interface TimelineState {
  timelineById: TimelineById;
  showCallOutUnauthorizedMsg: boolean;
  insertTimeline: InsertTimeline | null;
}

export interface TimelineModelSettings {
  documentType: string;
  defaultColumns: ColumnHeaderOptions[];
  /** A list of Ids of excluded Row Renderers */
  excludedRowRendererIds: RowRendererId[];
  footerText?: string | React.ReactNode;
  loadingText?: string | React.ReactNode;
  queryFields: string[];
  selectAll: boolean;
  showCheckboxes?: boolean;
  sort: SortColumnTimeline[];
  title: string;
  unit?: (n: number) => string | React.ReactNode;
}

export interface InitialyzeTimelineSettings extends Partial<TimelineModelSettings> {
  id: string;
}
