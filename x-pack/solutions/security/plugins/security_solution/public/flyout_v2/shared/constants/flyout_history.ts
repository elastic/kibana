/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared key identifying a Security Solution document flyout history stack.
 * Used by alert, event, and IOC flyouts so they share a single history,
 * allowing back-navigation across flyout types if/when cross-navigation is added.
 */
export const documentFlyoutHistoryKey = Symbol('document');

/**
 * Dedicated history key for flyouts opened from within Timeline. Kept separate from
 * `documentFlyoutHistoryKey` so that a flyout opened from Timeline (eg after "Investigate in
 * timeline" from a flyout opened elsewhere) doesn't share back/history navigation with - or get
 * closed alongside - whatever flyout was already open before Timeline was shown.
 *
 * See `session_context.tsx` for how this gets threaded into flyouts opened from Timeline (and
 * propagated into anything opened from within those).
 */
export const timelineFlyoutHistoryKey = Symbol('timeline');
