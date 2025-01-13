/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { DataProvider } from '../../../common';

interface TimelineById {
  [id: string]: {
    dataProviders: DataProvider[];
  };
}

export const addProviderToTimelineHelper = (
  id: string,
  provider: DataProvider,
  timelineById: TimelineById
): TimelineById => {
  const timeline = timelineById[id];
  const alreadyExistsAtIndex = timeline.dataProviders.findIndex((p) => p.id === provider.id);

  if (alreadyExistsAtIndex > -1 && !isEmpty(timeline.dataProviders[alreadyExistsAtIndex].and)) {
    provider.id = `${provider.id}-${
      timeline.dataProviders.filter((p) => p.id === provider.id).length
    }`;
  }

  const dataProviders =
    alreadyExistsAtIndex > -1 && isEmpty(timeline.dataProviders[alreadyExistsAtIndex].and)
      ? [
          ...timeline.dataProviders.slice(0, alreadyExistsAtIndex),
          provider,
          ...timeline.dataProviders.slice(alreadyExistsAtIndex + 1),
        ]
      : [...timeline.dataProviders, provider];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders,
    },
  };
};
