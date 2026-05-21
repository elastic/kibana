/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { getHostDetailsUrl } from '../../../common/components/link_to';
import { SecuritySolutionLinkAnchor } from '../../../common/components/links';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutTitle } from '../../../flyout_v2/shared/components/flyout_title';
import type { FirstLastSeenData } from '../shared/components/observed_entity/types';
import type { IdentityFields } from '../../document_details/shared/utils';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { EntitySourceBadge } from '../shared/components/entity_source_badge';
import { RiskLevelBadge } from '../shared/components/risk_level_badge';

interface HostPanelHeaderProps {
  hostName: string;
  lastSeen: FirstLastSeenData;
  entityId?: string;
  identityFields?: IdentityFields;
  isEntityInStore?: boolean;
  riskLevel?: RiskSeverity;
}

const linkTitleCSS = { width: 'fit-content' };
const urlParamOverride = { timeline: { isOpen: false } };

export const HostPanelHeader = ({
  hostName,
  lastSeen,
  entityId,
  identityFields,
  isEntityInStore,
  riskLevel,
}: HostPanelHeaderProps) => {
  const lastSeenDate = lastSeen?.date;
  const isLoading = lastSeen?.isLoading ?? false;
  const lastSeenDateFormatted = useMemo(
    () => lastSeenDate && new Date(lastSeenDate),
    [lastSeenDate]
  );
  return (
    <FlyoutHeader
      data-test-subj="host-panel-header"
      hasBorder={false}
      css={css`
        & > .euiPanel {
          padding-bottom: 0;
        }
      `}
    >
      <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
        {!isEntityInStore && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" data-test-subj={'host-panel-header-lastSeen'}>
              {isLoading ? (
                <EuiSkeletonText
                  lines={1}
                  size="xs"
                  data-test-subj="host-panel-header-lastSeen-loading"
                />
              ) : (
                lastSeenDateFormatted && <PreferenceFormattedDate value={lastSeenDateFormatted} />
              )}
              <EuiSpacer size="xs" />
            </EuiText>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            gutterSize="xs"
            responsive={false}
            direction="column"
            alignItems="flexStart"
          >
            <EuiFlexItem grow={false}>
              {isEntityInStore ? (
                <FlyoutTitle title={hostName} iconType={'storage'} />
              ) : (
                <SecuritySolutionLinkAnchor
                  deepLinkId={SecurityPageName.hosts}
                  path={getHostDetailsUrl(
                    hostName,
                    undefined,
                    entityId,
                    identityFields && Object.keys(identityFields).length > 0
                      ? identityFields
                      : undefined
                  )}
                  target={'_blank'}
                  external={false}
                  css={linkTitleCSS}
                  override={urlParamOverride}
                >
                  <FlyoutTitle title={hostName} iconType={'storage'} isLink />
                </SecuritySolutionLinkAnchor>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {isLoading ? (
          <EuiFlexItem grow={true}>
            <EuiSkeletonText
              lines={1}
              size="xs"
              data-test-subj="host-panel-header-observed-badge-loading"
            />
          </EuiFlexItem>
        ) : (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge data-test-subj="host-panel-header-entity-type-badge" color="hollow">
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.host.entityTypeBadge"
                    defaultMessage="Host"
                  />
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EntitySourceBadge
                  isEntityInStore={!!isEntityInStore}
                  hasLastSeenDate={!!lastSeenDateFormatted}
                  data-test-subj="host-panel-header-observed-badge"
                />
              </EuiFlexItem>
              {isEntityInStore && riskLevel && (
                <EuiFlexItem grow={false}>
                  <RiskLevelBadge riskLevel={riskLevel} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </FlyoutHeader>
  );
};
