/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';

/**
 * The bars pinned over the page while it scrolls: the sticky page header and the security
 * template's timeline bar. Neither takes a ref, so they are found by their test subjects.
 */
export const APP_HEADER_SELECTOR = `[data-test-subj="${APP_HEADER_TEST_SUBJECTS.root}"]`;
export const TIMELINE_BAR_SELECTOR = '[data-test-subj="timeline-bottom-bar-container"]';
