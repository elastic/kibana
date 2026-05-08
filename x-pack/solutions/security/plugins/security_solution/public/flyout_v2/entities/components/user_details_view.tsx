/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { UserDetails } from '../../../flyout/document_details/left/components/user_details';
import { USER_DETAILS_VIEW_TEST_ID } from '../test_ids';

export interface UserDetailsViewProps {
  /**
   * Display name from the source document.
   */
  userName: string;
  /**
   * Canonical Entity Store v2 id, when already resolved.
   */
  entityId?: string;
  /**
   * Timestamp from the source alert/event.
   */
  timestamp: string;
  /**
   * Scope id used by cell actions and entity drill-ins.
   */
  scopeId: string;
  /**
   * Override invoked when the alerts insight chip is clicked.
   */
  onShowAlertsDetails?: () => void;
}

/**
 * Chrome-free user entity details body shared by legacy and v2 entity flyouts.
 */
export const UserDetailsView: FC<UserDetailsViewProps> = ({
  userName,
  entityId,
  timestamp,
  scopeId,
  onShowAlertsDetails,
}) => (
  <div data-test-subj={USER_DETAILS_VIEW_TEST_ID}>
    <UserDetails
      userName={userName}
      entityId={entityId}
      timestamp={timestamp}
      scopeId={scopeId}
      onShowAlertsDetails={onShowAlertsDetails}
    />
  </div>
);

UserDetailsView.displayName = 'UserDetailsView';
