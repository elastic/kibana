/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { INSIGHTS_ENTITIES_TEST_ID } from './test_ids';
import { ExpandablePanel } from '../../../../flyout_v2/shared/components/expandable_panel';
import { useDocumentDetailsContext } from '../../shared/context';
import { getHostEntityIdentifiers, getUserEntityIdentifiers } from '../../shared/utils';
import { HostEntityOverview } from './host_entity_overview';
import { UserEntityOverview } from './user_entity_overview';
import { LeftPanelInsightsTab } from '../../left';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../../common/entity_analytics/entity_store/constants';
import { useUiSetting } from '../../../../common/lib/kibana';
import { useEntityFromStore } from '../../../entity_details/shared/hooks/use_entity_from_store';

/**
 * Entities section under Insights section, overview tab. It contains a preview of host and user information.
 */
export const EntitiesOverview: React.FC = () => {
  const { getFieldsData, dataAsNestedObject, isPreviewMode } = useDocumentDetailsContext();
  const hostEntityIdentifiers = getHostEntityIdentifiers(dataAsNestedObject, getFieldsData);
  const userEntityIdentifiers = getUserEntityIdentifiers(dataAsNestedObject, getFieldsData);

  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);
  const userEntityFromStore = useEntityFromStore({
    entityIdentifiers: userEntityIdentifiers ?? {},
    entityType: 'user',
    skip: !userEntityIdentifiers || !entityStoreV2Enabled,
  });
  const hostEntityFromStore = useEntityFromStore({
    entityIdentifiers: hostEntityIdentifiers ?? {},
    entityType: 'host',
    skip: !hostEntityIdentifiers || !entityStoreV2Enabled,
  });

  const showUserOverview =
    userEntityIdentifiers &&
    (!entityStoreV2Enabled || userEntityFromStore.entityRecord != null);
  const showHostOverview =
    hostEntityIdentifiers &&
    (!entityStoreV2Enabled || hostEntityFromStore.entityRecord != null);
  const hasAnyEntity = showUserOverview || showHostOverview;

  const navigateToLeftPanel = useNavigateToLeftPanel({
    tab: LeftPanelInsightsTab,
    subTab: ENTITIES_TAB_ID,
  });

  const link = useMemo(
    () => ({
      callback: navigateToLeftPanel,
      tooltip: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.insights.entities.entitiesTooltip"
          defaultMessage="Show all entities"
        />
      ),
    }),
    [navigateToLeftPanel]
  );

  return (
    <>
      <ExpandablePanel
        header={{
          title: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.entities.entitiesTitle"
              defaultMessage="Entities"
            />
          ),
          link,
          iconType: !isPreviewMode ? 'arrowStart' : undefined,
        }}
        data-test-subj={INSIGHTS_ENTITIES_TEST_ID}
      >
        {hasAnyEntity ? (
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            {showUserOverview && userEntityIdentifiers && (
              <>
                <EuiFlexItem>
                  <UserEntityOverview
                    entityIdentifiers={userEntityIdentifiers}
                    entityRecord={entityStoreV2Enabled ? userEntityFromStore.entityRecord : undefined}
                  />
                </EuiFlexItem>
                <EuiSpacer size="s" />
              </>
            )}
            {showHostOverview && hostEntityIdentifiers && (
              <EuiFlexItem>
                <HostEntityOverview
                  entityIdentifiers={hostEntityIdentifiers}
                  entityRecord={entityStoreV2Enabled ? hostEntityFromStore.entityRecord : undefined}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.insights.entities.noDataDescription"
            defaultMessage="Host and user information are unavailable for this alert."
          />
        )}
      </ExpandablePanel>
    </>
  );
};

EntitiesOverview.displayName = 'EntitiesOverview';
