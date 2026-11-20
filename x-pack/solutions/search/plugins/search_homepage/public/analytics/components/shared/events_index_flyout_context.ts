/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

export interface EventsIndexFlyoutApi {
  /** False outside an `EventsIndexFlyoutProvider`. */
  isAvailable: boolean;
  /** Opens the flyout; `opener` gets the focus back when it closes. */
  open: (opener?: HTMLElement | null) => void;
}

const UNAVAILABLE: EventsIndexFlyoutApi = { isAvailable: false, open: () => {} };

export const EventsIndexFlyoutContext = createContext<EventsIndexFlyoutApi>(UNAVAILABLE);

export const useEventsIndexFlyout = (): EventsIndexFlyoutApi =>
  useContext(EventsIndexFlyoutContext);
