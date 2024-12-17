/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPageName } from '../../../../common/constants';
import { needsUrlState } from '../../links';

export const getSearch = (pageName: SecurityPageName, globalQueryString: string): string =>
  needsUrlState(pageName) && globalQueryString.length > 0 ? `?${globalQueryString}` : '';
