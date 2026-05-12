/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { HostEntityOverview } from './host_entity_overview';
import { UserEntityOverview } from './user_entity_overview';
import { noopCellActionRenderer } from '../../shared/components/cell_actions';
import type { CellActionRenderer } from '../../shared/components/cell_actions';
import { INSIGHTS_ENTITIES_TEST_ID } from './test_ids';
import { useEntitiesOverview } from '../hooks/use_entities_overview';

export interface EntitiesOverviewProps {
  /**
   * Document record used to retrieve host and user fields.
   */
  hit: DataTableRecord;
  /**
   * Whether to show the navigation icon in the panel header.
   */
  showIcon?: boolean;
  /**
   * Scope id forwarded to the host/user sub-overviews for cell actions and preview links.
   */
  scopeId?: string;
  /**
   * Renderer for cell actions on field values. Falls back to a no-op (no actions) when not provided.
   */
  renderCellActions?: CellActionRenderer;
  /**
   * Callback to navigate to the entities details panel. When omitted, the header link is hidden.
   */
  onShowEntitiesDetails?: () => void;
  /**
   * When true, host/user names render as preview links and the alert/misconfig/vuln chips
   * become clickable. The legacy expandable flyout sets this; Flyout v2 and Discover leave
   * it off so everything renders as plain text.
   */
  enableEntityLinks?: boolean;
}

const HEADER_TITLE = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.entities.entitiesTitle"
    defaultMessage="Entities"
  />
);
const HEADER_TOOLTIP = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.entities.entitiesTooltip"
    defaultMessage="Show all entities"
  />
);
const NO_DATA = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.entities.noDataDescription"
    defaultMessage="Host and user information are unavailable for this alert."
  />
);

/**
 * Entities section under Insights section, overview tab. It contains a preview of host and user information.
 */
export const EntitiesOverview: FC<EntitiesOverviewProps> = memo(
  ({
    hit,
    showIcon = true,
    scopeId = '',
    renderCellActions = noopCellActionRenderer,
    onShowEntitiesDetails,
    enableEntityLinks = false,
  }) => {
    const { user, host, hasAnyEntity } = useEntitiesOverview({ hit });

    const link = useMemo(
      () =>
        onShowEntitiesDetails
          ? {
              callback: onShowEntitiesDetails,
              tooltip: HEADER_TOOLTIP,
            }
          : undefined,
      [onShowEntitiesDetails]
    );

    return (
      <ExpandablePanel
        header={{
          title: HEADER_TITLE,
          link,
          iconType: showIcon ? 'chevronLimitLeft' : undefined,
        }}
        data-test-subj={INSIGHTS_ENTITIES_TEST_ID}
      >
        {hasAnyEntity ? (
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            {user && (
              <EuiFlexItem>
                <UserEntityOverview
                  userName={user.name}
                  identityFields={user.identityFields}
                  entityRecord={user.entityRecord}
                  scopeId={scopeId}
                  renderCellActions={renderCellActions}
                  enableEntityLinks={enableEntityLinks}
                />
              </EuiFlexItem>
            )}
            {host && (
              <EuiFlexItem>
                <HostEntityOverview
                  hostName={host.name}
                  identityFields={host.identityFields}
                  entityRecord={host.entityRecord}
                  scopeId={scopeId}
                  renderCellActions={renderCellActions}
                  enableEntityLinks={enableEntityLinks}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : (
          NO_DATA
        )}
      </ExpandablePanel>
    );
  }
);

EntitiesOverview.displayName = 'EntitiesOverview';
