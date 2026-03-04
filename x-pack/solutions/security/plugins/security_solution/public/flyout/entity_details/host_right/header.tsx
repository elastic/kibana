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
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { EntityIdentifierFields } from '../../../../common/entity_analytics/types';
import { getHostDetailsUrl } from '../../../common/components/link_to';
import { SecuritySolutionLinkAnchor } from '../../../common/components/links';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutTitle } from '../../shared/components/flyout_title';
import type { EntityIdentifiers } from '../../document_details/shared/utils';
import type { FirstLastSeenData } from '../shared/components/observed_entity/types';
import type { EntityStoreRecord } from '../shared/hooks/use_entity_from_store';

interface HostPanelHeaderProps {
  entityIdentifiers: EntityIdentifiers;
  lastSeen: FirstLastSeenData;
  /** When entity store v2 is enabled: entity record from the store. */
  entity?: EntityStoreRecord;
}

const linkTitleCSS = { width: 'fit-content' };
const urlParamOverride = { timeline: { isOpen: false } };

export const HostPanelHeader = ({
  entityIdentifiers,
  lastSeen,
  entity,
}: HostPanelHeaderProps) => {
  const hostName = useMemo(
    () =>
      entityIdentifiers[EntityIdentifierFields.hostName] ||
      Object.values(entityIdentifiers)[0] ||
      '',
    [entityIdentifiers]
  );

  const lastSeenDate = lastSeen?.date;
  const isLoading = lastSeen?.isLoading ?? false;
  const lastSeenDateFormatted = useMemo(
    () => lastSeenDate && new Date(lastSeenDate),
    [lastSeenDate]
  );

  const hostDetailsPath = useMemo(() => getHostDetailsUrl(hostName, undefined), [hostName]);

  return (
    <FlyoutHeader data-test-subj="host-panel-header">
      <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
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
        <EuiFlexItem grow={false}>
          <SecuritySolutionLinkAnchor
            deepLinkId={SecurityPageName.hosts}
            path={hostDetailsPath}
            target={'_blank'}
            external={false}
            css={linkTitleCSS}
            override={urlParamOverride}
          >
            <FlyoutTitle title={hostName} iconType={'storage'} isLink />
          </SecuritySolutionLinkAnchor>
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
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                {lastSeenDateFormatted && (
                  <EuiBadge data-test-subj="host-panel-header-observed-badge" color="hollow">
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.host.observedBadge"
                      defaultMessage="Observed"
                    />
                  </EuiBadge>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </FlyoutHeader>
  );
};
