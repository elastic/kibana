/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsWithinMaxBreakpoint } from '@elastic/eui';

/**
 * Phone and small tablet widths: the range where EUI collapses flex groups, tables and flyouts
 * into their stacked layouts. Layout that EUI doesn't adapt on its own should follow it.
 */
export const useIsMobile = (): boolean => useIsWithinMaxBreakpoint('s');

/** Page sections give up some of their side padding on a phone so the content gets the width. */
export const usePageSectionPaddingSize = (): 'm' | 'l' => (useIsMobile() ? 'm' : 'l');
