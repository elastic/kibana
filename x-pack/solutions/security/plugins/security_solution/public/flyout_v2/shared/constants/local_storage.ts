/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * localStorage key persisting the user's push vs overlay flyout preference.
 * Read when opening a flyout so the choice sticks across sessions.
 */
export const FLYOUT_PUSH_VS_OVERLAY_LOCAL_STORAGE = 'securitySolution.flyoutV2.pushVsOverlay';

/**
 * localStorage key persisting the user's resized width (in pixels) for main flyouts
 * (document/entity/…), read when opening one so the width sticks across sessions. Tool flyouts
 * (analyzer/…) intentionally do not persist a width: they can open side-by-side with a document,
 * where a saved standalone width can't be honored.
 */
export const FLYOUT_WIDTH_LOCAL_STORAGE = 'securitySolution.flyoutV2.width';
