/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The default minimum width of a column (when a width for the column type is not specified) */
export const DEFAULT_COLUMN_MIN_WIDTH = 180; // px

/** The minimum width of a resized column */
export const RESIZED_COLUMN_MIN_WITH = 70; // px

/** The default minimum width of a column of type `date` */
export const DEFAULT_DATE_COLUMN_MIN_WIDTH = 190; // px

export const DEFAULT_UNIFIED_TABLE_DATE_COLUMN_MIN_WIDTH = 215; // px

/**
 *
 * Timeline event detail row is technically a data grid column but it spans the entire width of the table
 * and that is why we are calling it a row
 *
 */
export const TIMELINE_EVENT_DETAIL_ROW_ID = 'timeline-event-detail-row';
