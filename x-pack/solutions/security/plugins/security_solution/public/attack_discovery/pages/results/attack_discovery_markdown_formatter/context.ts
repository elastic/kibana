/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

export interface MarkdownFormatterContextValue {
  disableActions: boolean;
  scopeId?: string;
  alertIds?: string[];
}

export const MarkdownFormatterContext = createContext<MarkdownFormatterContextValue>({
  disableActions: false,
});

export const useMarkdownFormatterContext = () => useContext(MarkdownFormatterContext);
