/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Soft page wash used across Nightshift (matches the prototype workspace panel). */
export const getNightshiftPageBackground = (colors: {
  backgroundBasePlain: string;
  backgroundBaseSubdued: string;
}): string =>
  `linear-gradient(180deg, ${colors.backgroundBasePlain} 0%, ${colors.backgroundBaseSubdued} 50%, ${colors.backgroundBasePlain} 100%), ${colors.backgroundBasePlain}`;
