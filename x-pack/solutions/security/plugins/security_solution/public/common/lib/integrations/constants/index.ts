/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CategoryFacet } from '@kbn/fleet-plugin/public';

export const INTEGRATION_CARD_HEIGHT = 156;
export const TELEMETRY_INTEGRATION_CARD = `card`;
export const MAX_CARD_HEIGHT_IN_PX = 127; // px
export const INTEGRATION_APP_ID = `integrations`;
export const CARD_TITLE_LINE_CLAMP = 1; // 1 line of text
export const CARD_DESCRIPTION_LINE_CLAMP = 3; // 3 lines of text
export const LOADING_SKELETON_TEXT_LINES = 10; // 10 lines of text
export const SCROLL_ELEMENT_ID = 'integrations-scroll-container';
export const SEARCH_FILTER_CATEGORIES: CategoryFacet[] = [];
export const DEFAULT_INTEGRATION_CARD_CONTENT_HEIGHT = `${INTEGRATION_CARD_HEIGHT * 3.5 + 55}px`;
export const TELEMETRY_INTEGRATION_TAB = `tab`;
