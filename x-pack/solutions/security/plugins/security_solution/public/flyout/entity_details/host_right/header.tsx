/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiBadge, EuiText, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import type { HostItem } from '../../../../common/search_strategy';
import { getHostDetailsUrl } from '../../../common/components/link_to';
import { SecuritySolutionLinkAnchor } from '../../../common/components/links';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutTitle } from '../../shared/components/flyout_title';
import type { ObservedEntityData } from '../shared/components/observed_entity/types';

interface HostPanelHeaderProps {
  hostName: string;
  observedHost: ObservedEntityData<HostItem>;
}

const linkTitleCSS = { width: 'fit-content' };

export const HostPanelHeader = ({ hostName, observedHost }: HostPanelHeaderProps) => {
  const lastSeenDate = useMemo(
    () => observedHost.lastSeen.date && new Date(observedHost.lastSeen.date),
    [observedHost.lastSeen.date]
  );

  return (
    <FlyoutHeader data-test-subj="host-panel-header">
      <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" data-test-subj={'host-panel-header-lastSeen'}>
            {lastSeenDate && <PreferenceFormattedDate value={lastSeenDate} />}
            <EuiSpacer size="xs" />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SecuritySolutionLinkAnchor
            deepLinkId={SecurityPageName.hosts}
            path={getHostDetailsUrl(hostName)}
            target={'_blank'}
            external={false}
            css={linkTitleCSS}
          >
            <FlyoutTitle title={hostName} iconType={'storage'} isLink />
          </SecuritySolutionLinkAnchor>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {observedHost.lastSeen.date && (
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
      </EuiFlexGroup>
    </FlyoutHeader>
  );
};
