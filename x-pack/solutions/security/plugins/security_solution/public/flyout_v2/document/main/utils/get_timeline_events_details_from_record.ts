/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { EventHit } from '@kbn/timelines-plugin/common/search_strategy';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { getTimelineFieldsDataFromHit } from '@kbn/timelines-plugin/common';

/**
 * Converts a `DataTableRecord` into the `TimelineEventsDetailsItem[]` format expected by the table
 * tab and other field-browser consumers.
 *
 * Delegates to the shared `getTimelineFieldsDataFromHit` — the same formatter the server uses to
 * build `dataFormattedForFieldBrowser`. It runs on `hit.raw` (the raw ES hit, which carries
 * `fields` / `_source` / `_id` / `_index`), so object-array fields (e.g. `threat.enrichments`) are
 * serialized correctly and metadata fields are included. This produces the exact same rows/values
 * the expandable flyout got from its server fetch, on every surface (Security flyout and Discover).
 */
export const getTimelineEventsDetailsFromRecord = (
  hit: DataTableRecord
): TimelineEventsDetailsItem[] => getTimelineFieldsDataFromHit(hit.raw as SearchHit<EventHit>);
