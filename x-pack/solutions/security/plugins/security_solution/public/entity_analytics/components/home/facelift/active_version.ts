/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Active EA Facelift prototype version.
 *
 * Home UI lives in `./v1` and `./v2` as independent code snapshots. Flyout /
 * table mock bridges read this module so external hooks follow the selected
 * version. To ship a single final version later: keep that folder, delete the
 * others, drop the switcher, and point the thin root bridges at the survivor
 * (or move its files up one level and delete the bridges).
 */

export type FaceliftVersion = 'v1' | 'v2';

export const DEFAULT_FACELIFT_VERSION: FaceliftVersion = 'v2';

let activeFaceliftVersion: FaceliftVersion = DEFAULT_FACELIFT_VERSION;

export const getActiveFaceliftVersion = (): FaceliftVersion => activeFaceliftVersion;

export const setActiveFaceliftVersion = (version: FaceliftVersion): void => {
  activeFaceliftVersion = version;
};
