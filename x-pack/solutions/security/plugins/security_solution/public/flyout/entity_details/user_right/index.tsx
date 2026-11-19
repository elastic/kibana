/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { USER_PANEL_OBSERVED_USER_QUERY_ID } from '../../../flyout_v2/entity/user/main/constants';

export { USER_PANEL_OBSERVED_USER_QUERY_ID };

interface UserPanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  isPreviewMode: boolean;
  /**
   * Display name from the source row / document (typically `user.name`).
   */
  userName: string;
  /**
   * Canonical Entity Store v2 id (`entity.id`) when already resolved (e.g. from alerts/events table).
   */
  entityId?: string;
}

export interface UserPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'user-panel' | 'user-preview-panel';
  params: UserPanelProps;
}
