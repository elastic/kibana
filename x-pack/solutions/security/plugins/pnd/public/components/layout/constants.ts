/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Top inset for PND page sections. Kept small so titles sit snug under
 * Kibana chrome (closer to Discover / Chats than a full `l`/`xl` pad).
 */
export const PND_PAGE_PADDING_TOP = 12;

/** Watches section secondary nav width (Throughline panel feel). */
export const PND_WATCHES_SUBNAV_WIDTH = 272;

/** Centered main column width on laptops, up to `PND_PAGE_WIDE_MIN_WIDTH`. */
export const PND_PAGE_CONTENT_MAX_WIDTH = 960;

/** Centered main column width on wide desktop monitors. */
export const PND_PAGE_CONTENT_MAX_WIDTH_WIDE = 1300;

/** Viewport width at which the main column widens to its desktop cap. */
export const PND_PAGE_WIDE_MIN_WIDTH = 1920;
