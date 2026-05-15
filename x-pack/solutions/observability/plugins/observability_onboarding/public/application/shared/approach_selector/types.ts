/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEventHandler } from 'react';
import type { SupportedLogo } from '../logo_icon';

export interface ApproachOption {
  id: string;
  label: string;
  description: string;
  logo: SupportedLogo;
  recommended?: boolean;
  href: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}
