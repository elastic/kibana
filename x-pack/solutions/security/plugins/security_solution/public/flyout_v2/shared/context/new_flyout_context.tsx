/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

/**
 * Context flag indicating that the current subtree is rendered inside the new
 * flyout system (`overlays.openSystemFlyout`).
 *
 * Legacy shared components (e.g. entity overviews) that render field links via the
 * expandable-flyout API can read this to opt into the new system's `OpenFlyoutLink`
 * instead, so those links keep working when the component is reused inside a v2 flyout.
 */
export const NewFlyoutContext = createContext<boolean>(false);

/**
 * Returns true when rendered inside the new flyout system. Defaults to false.
 */
export const useIsInNewFlyout = (): boolean => useContext(NewFlyoutContext);
