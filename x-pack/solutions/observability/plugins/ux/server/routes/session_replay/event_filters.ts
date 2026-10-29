/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Event filters shared by the session list and detail routes. */
export const EXCEPTION_FILTER = {
  bool: {
    should: [
      { term: { event_name: 'exception' } },
      { term: { name: 'exception' } },
      { term: { 'attributes.event.outcome': 'failure' } },
      { term: { 'attributes.log.level': 'ERROR' } },
    ],
    minimum_should_match: 1,
  },
};

export const CLICK_FILTER = {
  bool: {
    should: [
      { term: { name: 'click' } },
      { term: { event_name: 'click' } },
      { term: { event_name: 'browser.frustration.rage_click' } },
      { term: { event_name: 'browser.frustration.dead_click' } },
      { term: { event_name: 'browser.frustration.error_click' } },
    ],
    minimum_should_match: 1,
  },
};
