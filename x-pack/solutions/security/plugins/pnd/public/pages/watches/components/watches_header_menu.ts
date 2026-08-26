/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import * as i18n from '../translations';

/** Both actions are placeholders — the destinations are not decided yet. */
const noop = () => undefined;

/**
 * Overflow actions shared by every Watches page header. Rendered behind the header's kebab, to the
 * right of the page's own switch when it has one.
 */
export const WATCHES_HEADER_MENU_ITEMS: NonNullable<AppHeaderMenu['items']> = [
  {
    id: 'pndDocumentation',
    label: i18n.HEADER_MENU_DOCUMENTATION,
    iconType: 'documentation',
    overflow: true,
    run: noop,
    testId: 'pndHeaderMenuDocumentation',
  },
  {
    id: 'pndGiveFeedback',
    label: i18n.HEADER_MENU_GIVE_FEEDBACK,
    iconType: 'comment',
    overflow: true,
    run: noop,
    testId: 'pndHeaderMenuGiveFeedback',
  },
];
