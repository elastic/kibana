/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash/fp';

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { ENRICHMENT_DESTINATION_PATH } from '../constants';
import type { EventHit, Fields, TimelineEventsDetailsItem } from '../search_strategy';
import { addNestedFieldFromSource } from './add_nested_field_from_source';
import { getDataFromFieldsHits } from './field_formatters';

/**
 * Transforms a SearchHit into an array of TimelineEventsDetailsItem, which is the format used to display the event details in the timeline.
 * It merges the fields and _source of the hit, and adds any nested fields from the _source based on the enrichmentPath.
 */
export const getTimelineFieldsDataFromHit = (
  hit: SearchHit<EventHit>
): TimelineEventsDetailsItem[] => {
  // _source is removed here as it's only needed in the rawEventData below
  const { fields, _source, ...hitsData } = hit ?? {};

  let fieldsData = getDataFromFieldsHits(
    merge(fields ?? {}, hitsData) as unknown as Fields // keep parity with existing behavior
  );

  fieldsData = addNestedFieldFromSource(
    fieldsData,
    _source as Record<string, unknown> | undefined,
    ENRICHMENT_DESTINATION_PATH
  );

  return fieldsData;
};
