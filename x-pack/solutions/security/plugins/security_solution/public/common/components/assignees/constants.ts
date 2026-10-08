/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ASSIGNEES_PANEL_WIDTH = 400;

/**
 * Space the assignees selectable reserves up front, so the popover is the same size while the
 * user profiles are loading as it is once they arrive.
 *
 * `EuiPopover` chooses which side of its anchor to open on when the panel first mounts, and from
 * then on re-pins that side whenever the content changes. A panel that is short while loading is
 * therefore measured as fitting below the button, and stays anchored there when the profiles
 * arrive and it grows — running off the bottom of the viewport. Reserving the loaded size from
 * the first render means the popover is measured at its final size and opens above or beside the
 * button when there is no room below.
 *
 * The value is the tallest the selectable gets: its search field, selection status and the
 * option list at the 6.5 rows of 48px that `EuiSelectable` caps an unbounded list to.
 */
export const ASSIGNEES_SELECTABLE_MIN_HEIGHT = 416;

export const NO_ASSIGNEES_VALUE = null;
