/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { UserDetailsView } from './user_details_view';
import { HostDetailsView } from './host_details_view';
import {
  noopCellActionRenderer,
  type CellActionRenderer,
} from '../../../../shared/components/cell_actions';
import { ENTITIES_DETAILS_TEST_ID } from '../test_ids';
import { useEntitiesDetails } from '../hooks/use_entities_details';

export interface EntitiesDetailsViewProps {
  hit: DataTableRecord;
  scopeId: string;
  renderCellActions?: CellActionRenderer;
  useLegacyExpandableFlyout?: boolean;
}

const NO_DATA = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.entities.noDataDescription"
    defaultMessage="Host and user information are unavailable for this alert."
  />
);

export const EntitiesDetailsView = memo(
  ({
    hit,
    scopeId,
    renderCellActions = noopCellActionRenderer,
    useLegacyExpandableFlyout = false,
  }: EntitiesDetailsViewProps) => {
    const { timestamp, user, host, hasAnyEntity } = useEntitiesDetails({
      hit,
    });

    if (!hasAnyEntity || timestamp == null) {
      return NO_DATA;
    }

    return (
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj={ENTITIES_DETAILS_TEST_ID}>
        {user && (
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.securitySolution.flyout.entities.userDetailsTitle"
                  defaultMessage="User"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <UserDetailsView
              userName={user.name}
              entityId={user.entityId}
              timestamp={timestamp}
              scopeId={scopeId}
              renderCellActions={renderCellActions}
              useLegacyExpandableFlyout={useLegacyExpandableFlyout}
            />
          </EuiFlexItem>
        )}
        {host && (
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.securitySolution.flyout.entities.hostDetailsTitle"
                  defaultMessage="Host"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <HostDetailsView
              hostName={host.name}
              entityId={host.entityId}
              timestamp={timestamp}
              scopeId={scopeId}
              hostEntityFromStoreResult={host.hostEntityFromStoreResult}
              renderCellActions={renderCellActions}
              useLegacyExpandableFlyout={useLegacyExpandableFlyout}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);

EntitiesDetailsView.displayName = 'EntitiesDetailsView';
