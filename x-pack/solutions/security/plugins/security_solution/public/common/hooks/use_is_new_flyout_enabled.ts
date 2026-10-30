/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns whether the new (EUI-based) flyout system should be used.
 *
 * Always `true`: the "Enable new flyout" advanced setting and its experimental flag have been
 * removed, so everyone gets the new flyout.
 * This hook only exists so the remaining `if (enableNewFlyout)` call sites keep compiling while
 * they are collapsed onto the new-flyout path; it will be removed once they are gone.
 */
export const useIsNewFlyoutEnabled = (): boolean => true;
