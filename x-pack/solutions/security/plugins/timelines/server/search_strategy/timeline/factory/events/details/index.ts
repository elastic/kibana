/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';
import type { TimelineEventsQueries } from '../../../../../../common/api/search_strategy';
import type {
  EventHit,
  TimelineEventsDetailsStrategyResponse,
} from '../../../../../../common/search_strategy';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { TimelineFactory } from '../../types';
import { buildTimelineDetailsQuery } from './query.events_details.dsl';
import { getTimelineFieldsDataFromHit } from '../../../../../../common/utils/get_timeline_fields_data_from_hit';
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

    const hit = response.rawResponse.hits.hits[0];
    const fieldsData = getTimelineFieldsDataFromHit(hit ?? {});
    const rawEventData = hit;
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
