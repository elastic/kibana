/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import type { SupportedLogo } from '../logo_icon';

export interface ApproachOption {
  id: string;
  label: string;
  description: string;
  // The card icon. Provide a `SupportedLogo` for a bundled brand asset, or
  // `euiIconType` for a native EUI icon (e.g. `agentApp` for Elastic Agent).
  // Exactly one of the two is expected.
  logo?: SupportedLogo;
  euiIconType?: EuiIconType;
  recommended?: boolean;
  // SPA path to push to history when the card is selected. The selector pushes
  // via useHistory directly rather than via `reactRouterNavigate`, because the
  // card is an EuiCheckableCard radio (not an anchor) and the radio's events
  // don't satisfy `reactRouterNavigate`'s left-click MouseEvent checks.
  navigateTo: string;
}
