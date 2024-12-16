/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/search-types';
import { TimelineEventsQueries } from '../../../../../../common/api/search_strategy';
import {
  EventHit,
  TimelineEventsDetailsStrategyResponse,
} from '../../../../../../common/search_strategy';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { TimelineFactory } from '../../types';
import { buildTimelineDetailsQuery } from './query.events_details.dsl';
import { getDataFromFieldsHits } from '../../../../../../common/utils/field_formatters';
import { buildEcsObjects } from '../../helpers/build_ecs_objects';

export const timelineEventsDetails: TimelineFactory<TimelineEventsQueries.details> = {
  buildDsl: (parsedRequest) => {
    const { authFilter, ...options } = parsedRequest;
    const { indexName, eventId, runtimeMappings = {} } = options;
    return buildTimelineDetailsQuery({
      indexName,
      id: eventId,
      runtimeMappings,
      authFilter,
    });
  },
  parse: async (
    options,
    response: IEsSearchResponse<EventHit>
  ): Promise<TimelineEventsDetailsStrategyResponse> => {
    const { indexName, eventId, runtimeMappings = {} } = options;
    // _source is removed here as it's only needed in the rawEventData below
    const { fields, _source, ...hitsData } = response.rawResponse.hits.hits[0] ?? {};

    const inspect = {
      dsl: [
        inspectStringifyObject(
          buildTimelineDetailsQuery({ indexName, id: eventId, runtimeMappings })
        ),
      ],
    };
    if (response.isRunning) {
      return {
        ...response,
        data: [],
        inspect,
      };
    }

    const fieldsData = getDataFromFieldsHits(merge(fields, hitsData));

    const rawEventData = response.rawResponse.hits.hits[0];
    const ecs = buildEcsObjects(rawEventData as EventHit);

    return {
      ...response,
      data: fieldsData,
      ecs,
      inspect,
      rawEventData,
    };
  },
};
