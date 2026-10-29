/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { HtmlPortalNode } from 'react-reverse-portal';

/**
 * Portal node the findings search bar renders into, so the Findings page can place it right below
 * its app header instead of inside the selected tab's content.
 */
export const FindingsSearchBarPortalContext = createContext<HtmlPortalNode | undefined>(undefined);
