/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocumentDetailsRightPanelKey } from '../../constants/panel_keys';

interface RedirectParams {
  index: string;
  eventId: string;
  scopeId: string;
}

/**
 * Builds flyout state from basic event-related data, such as index name, event id and scope id.
 * This value can be used to open the flyout either by passing it directly to the flyout api (exposed via ref) or
 * by serializing it to the url & performing a redirect
 */
export const expandableFlyoutStateFromEventMeta = ({ index, eventId, scopeId }: RedirectParams) => {
  return {
    right: {
      id: DocumentDetailsRightPanelKey,
      params: {
        id: eventId,
        indexName: index,
        scopeId,
      },
    },
    left: undefined,
    preview: [],
  };
};
