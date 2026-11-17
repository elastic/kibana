/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kept free of imports: `deep_links.ts` is page-load critical and reads this synchronously.
export const HUNT_LIBRARY_SECTION_ID = 'hunt_library' as const;
export const HUNT_LIBRARY_PATH = `/watches/${HUNT_LIBRARY_SECTION_ID}` as const;
