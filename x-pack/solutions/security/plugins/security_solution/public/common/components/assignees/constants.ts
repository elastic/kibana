/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ASSIGNEES_PANEL_WIDTH = 400;

/**
 * `UserProfilesSelectable` applies this as a max-height over its search field, selection status
 * and option list together, so the list scrolls past roughly three of its 48px rows rather than
 * growing with the number of suggested users. 240px plus the 32px Apply button rendered below it
 * keeps the popover inside the 288px available beneath an anchor at the midpoint of a 576px-tall
 * window, which is the height Scout runs at.
 */
export const ASSIGNEES_SELECTABLE_MAX_HEIGHT = 240;

export const NO_ASSIGNEES_VALUE = null;
