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
