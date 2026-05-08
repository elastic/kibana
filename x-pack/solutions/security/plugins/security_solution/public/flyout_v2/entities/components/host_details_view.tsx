/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { HostItem } from '../../../../common/search_strategy';
import type { EntityFromStoreResult } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { HostDetails } from '../../../flyout/document_details/left/components/host_details';
import { HOST_DETAILS_VIEW_TEST_ID } from '../test_ids';

export interface HostDetailsViewProps {
  /**
   * Display name from the source document.
   */
  hostName: string;
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
   * Optional Entity Store result already resolved by the parent details view.
   */
  hostEntityFromStoreResult?: EntityFromStoreResult<HostItem> | null;
  /**
   * Override invoked when the alerts insight chip is clicked.
   */
  onShowAlertsDetails?: () => void;
}

/**
 * Chrome-free host entity details body shared by legacy and v2 entity flyouts.
 */
export const HostDetailsView: FC<HostDetailsViewProps> = ({
  hostName,
  entityId,
  timestamp,
  scopeId,
  hostEntityFromStoreResult,
  onShowAlertsDetails,
}) => (
  <div data-test-subj={HOST_DETAILS_VIEW_TEST_ID}>
    <HostDetails
      hostName={hostName}
      entityId={entityId}
      timestamp={timestamp}
      scopeId={scopeId}
      hostEntityFromStoreResult={hostEntityFromStoreResult}
      onShowAlertsDetails={onShowAlertsDetails}
    />
  </div>
);

HostDetailsView.displayName = 'HostDetailsView';
