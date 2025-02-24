/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mergeWith, isArray } from 'lodash';

import type { ApplyEnrichmentsToEvents, MergeEnrichments } from '../types';

function customizer<T>(objValue: T, srcValue: T) {
  if (isArray(objValue)) {
    return objValue.concat(srcValue);
  }
}

export const mergeEnrichments: MergeEnrichments = (enrichmentsList = []) => {
  return enrichmentsList.reduce((acc, val) => mergeWith(acc, val, customizer), {});
};

export const applyEnrichmentsToEvents: ApplyEnrichmentsToEvents = ({
  events,
  enrichmentsList,
  logger,
}) => {
  const mergedEnrichments = mergeEnrichments(enrichmentsList);
  logger.debug(`${Object.keys(mergedEnrichments).length} events ready to be enriched`);
  const enrichedEvents = events.map((event) => {
    const enrichFunctions = mergedEnrichments[event._id];

    if (!enrichFunctions) return event;

    return enrichFunctions.reduce((acc, enrichFunction) => enrichFunction(acc), event);
  });

  return enrichedEvents;
};
