/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsWithinMaxBreakpoint } from '@elastic/eui';

export const useIsMobile = (): boolean => useIsWithinMaxBreakpoint('s');

export const usePageSectionPaddingSize = (): 'm' | 'l' => (useIsMobile() ? 'm' : 'l');
