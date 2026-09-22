/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import type { SupportedLogo } from '../logo_icon';

export interface CollectionMethodOption {
  id: string;
  label: string;
  description: string;
  logo?: SupportedLogo;
  euiIconType?: EuiIconType;
  recommended?: boolean;
  navigateTo: string;
}
