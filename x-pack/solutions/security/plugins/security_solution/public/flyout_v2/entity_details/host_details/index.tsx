/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle, useEuiTheme } from '@elastic/eui';
import { useTabs } from '../../../flyout/entity_details/host_details_left/hooks';
import type { EntityDetailsPath } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';

export interface HostDetailsProps {
  isRiskScoreExist: boolean;
  hostName: string;
  entityId: string;
  scopeId: string;
  hasMisconfigurationFindings?: boolean;
  hasVulnerabilitiesFindings?: boolean;
  hasNonClosedAlerts?: boolean;
  entityStoreEntityId?: string;
  initialPath?: EntityDetailsPath;
}

export const HostDetails: FC<HostDetailsProps> = ({
  isRiskScoreExist,
  hostName,
  entityId,
  scopeId,
  hasMisconfigurationFindings,
  hasVulnerabilitiesFindings,
  hasNonClosedAlerts,
  entityStoreEntityId,
  initialPath,
}) => {
  const { euiTheme } = useEuiTheme();
  const tabs = useTabs({
    isRiskScoreExist,
    hostName,
    entityId,
    scopeId,
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    hasNonClosedAlerts,
    entityStoreEntityId,
  });

  const selectedTab = useMemo(() => {
    if (initialPath?.tab) {
      const match = tabs.find((tab) => tab.id === initialPath.tab);
      if (match) return match;
    }
    return tabs[0];
  }, [initialPath, tabs]);

  if (!selectedTab) {
    return null;
  }

  return (
    <>
      <EuiFlyoutHeader
        hasBorder
        css={css`
          padding-block: ${euiTheme.size.s} !important;
        `}
      >
        <EuiTitle size="xs">
          <h4>{selectedTab.name}</h4>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{selectedTab.content}</EuiFlyoutBody>
    </>
  );
};

HostDetails.displayName = 'HostDetails';
