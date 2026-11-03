/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The EA timeline prototype carries a single facelift snapshot, v.9.1 (`./v9_1`).
 *
 * Shared flyout / table code still gates facelift refinements on
 * `isFaceliftV8OrLater` / `isFaceliftV9OrLater`; with one version left those
 * checks are always true. The hook and setters are kept so those call sites
 * did not have to change.
 */

import { useCallback } from 'react';

export type FaceliftVersion = 'v9_1';

export const DEFAULT_FACELIFT_VERSION: FaceliftVersion = 'v9_1';

export const getActiveFaceliftVersion = (): FaceliftVersion => DEFAULT_FACELIFT_VERSION;

export const setActiveFaceliftVersion = (_version: FaceliftVersion): void => {};

export const useActiveFaceliftVersion = (): [
  FaceliftVersion,
  (version: FaceliftVersion) => void
] => {
  const setFaceliftVersion = useCallback(setActiveFaceliftVersion, []);
  return [DEFAULT_FACELIFT_VERSION, setFaceliftVersion];
};

export const isFaceliftAppHeaderVersion = (_version: FaceliftVersion): boolean => true;

export const isFaceliftV8OrLater = (_version: FaceliftVersion): boolean => true;

export const isFaceliftV9OrLater = (_version: FaceliftVersion): boolean => true;
