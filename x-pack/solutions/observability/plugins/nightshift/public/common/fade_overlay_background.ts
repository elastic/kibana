/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FADE_OVERLAY_GRADIENT_STOP = '40%';

export const createFadeOverlayBackground = (backgroundColor: string): string =>
  `linear-gradient(90deg, transparent 0%, ${backgroundColor} ${FADE_OVERLAY_GRADIENT_STOP}, ${backgroundColor} 100%)`;
