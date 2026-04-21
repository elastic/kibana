/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocumentDetailsRightPanelKey } from '../../document_details/shared/constants/panel_keys';
import { expandableFlyoutStateFromEventMeta } from './expandable_flyout_state_from_event_meta';

describe('expandableFlyoutStateFromEventMeta', () => {
  it('builds document details right panel state', () => {
    expect(
      expandableFlyoutStateFromEventMeta({
        index: '.idx',
        eventId: 'evt-1',
        scopeId: 'alerts-page',
      })
    ).toEqual({
      right: {
        id: DocumentDetailsRightPanelKey,
        params: {
          id: 'evt-1',
          indexName: '.idx',
          scopeId: 'alerts-page',
        },
      },
      left: undefined,
      preview: [],
    });
  });
});
