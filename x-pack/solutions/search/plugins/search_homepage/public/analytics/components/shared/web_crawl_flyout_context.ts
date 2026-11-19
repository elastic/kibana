/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

export interface WebCrawlFlyoutApi {
  /** False without the web crawler plugin, and outside a `WebCrawlFlyoutProvider`. */
  isAvailable: boolean;
  /** Opens the flyout; `opener` gets the focus back when it closes. */
  open: (opener?: HTMLElement | null) => void;
}

const UNAVAILABLE: WebCrawlFlyoutApi = { isAvailable: false, open: () => {} };

export const WebCrawlFlyoutContext = createContext<WebCrawlFlyoutApi>(UNAVAILABLE);

export const useWebCrawlFlyout = (): WebCrawlFlyoutApi => useContext(WebCrawlFlyoutContext);
