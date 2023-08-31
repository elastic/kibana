/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTS_URL } from '../../../../urls/navigation';
import { DISCOVER_CONTAINER } from '../../../../screens/discover';
import { updateDateRangeInLocalDatePickers } from '../../../../tasks/date_picker';
import { login, visit } from '../../../../tasks/login';
import { createNewTimeline, gotToDiscoverTab } from '../../../../tasks/timeline';

const INITIAL_START_DATE = 'Jan 18, 2021 @ 20:33:29.186';
const INITIAL_END_DATE = 'Jan 19, 2024 @ 20:33:29.186';

describe(
  'Discover Timeline State Integration',
  { env: { ftrConfig: { enableExperimental: ['discoverInTimeline'] } } },

  () => {
    beforeEach(() => {
      login();
      visit(ALERTS_URL);
      createNewTimeline();
      gotToDiscoverTab();
      updateDateRangeInLocalDatePickers(DISCOVER_CONTAINER, INITIAL_START_DATE, INITIAL_END_DATE);
    });
    context('save', () => {
      it('should save/restore discover timerange when saving timeline', () => {});
      it('should save/restore discover dataview when saving timeline', () => {});
      it('should save/restore discover filter when saving timeline', () => {});
      it('should save/restore discover query when saving timeline', () => {});
      it('should save/restore discover esql when saving timeline', () => {});
    });
    context('saved search tags', () => {
      it('should create `Security Solution Timeline` tag if not available', () => {});
      it('should not re-create `Security Solution Timeline` tag if available', () => {});
      it('should save discover saved search with `Security Solution Timeline` tag', () => {});
    });
    context('saved search', () => {
      it('should rename the saved search on timeline rename', () => {});
    });

    context('Advanced Settings', () => {
      it('rows per page in saved search should be according to the user selected number of pages', () => {});
      it('rows per page in new search should be according to the value selected in advanced settings', () => {});
    });
  }
);
