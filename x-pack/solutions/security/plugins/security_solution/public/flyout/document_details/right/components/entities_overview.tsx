/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FF_ENABLE_ENTITY_STORE_V2, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { INSIGHTS_ENTITIES_TEST_ID } from './test_ids';
import { ExpandablePanel } from '../../../../flyout_v2/shared/components/expandable_panel';
import { useDocumentDetailsContext } from '../../shared/context';
import { HostEntityOverview } from './host_entity_overview';
import { UserEntityOverview } from './user_entity_overview';
import { getField } from '../../shared/utils';
import { LeftPanelInsightsTab } from '../../left';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';
import { useEntityFromStore } from '../../../entity_details/shared/hooks/use_entity_from_store';
import { type IdentityFields } from '../../shared/utils';

/**
 * Entities section under Insights section, overview tab. It contains a preview of host and user information.
 */
export const EntitiesOverview: React.FC = () => {
  const { dataAsNestedObject, isPreviewMode, getFieldsData } = useDocumentDetailsContext();
  const hostName = getField(getFieldsData('host.name'));
  const userName = getField(getFieldsData('user.name'));

  const euidApi = useEntityStoreEuidApi();
  const hostEntityIdentifiers = euidApi?.euid.getEntityIdentifiersFromDocument(
    'host',
    dataAsNestedObject
  ) as IdentityFields;

  const hostEntitId = euidApi?.euid.getEuidFromObject('host', dataAsNestedObject);

  const userEntityIdentifiers = euidApi?.euid.getEntityIdentifiersFromDocument(
    'user',
    dataAsNestedObject
  ) as IdentityFields;
  const userEntityId = euidApi?.euid.getEuidFromObject('user', dataAsNestedObject);

  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);

  const userEntityFromStore = useEntityFromStore({
    entityId: userEntityId,
    identityFields: userEntityIdentifiers ?? undefined,
    entityType: 'user',
    skip: !entityStoreV2Enabled,
  });
  const hostEntityFromStore = useEntityFromStore({
    entityId: hostEntitId,
    identityFields: hostEntityIdentifiers ?? undefined,
    entityType: 'host',
    skip: !entityStoreV2Enabled,
  });

  const showUserOverview =
    (!entityStoreV2Enabled && userName != null) ||
    (entityStoreV2Enabled && userEntityFromStore.entityRecord != null);
  const showHostOverview =
    (!entityStoreV2Enabled && hostName != null) ||
    (entityStoreV2Enabled && hostEntityFromStore.entityRecord != null);
  const hasAnyEntity =
    (showUserOverview && !!userEntityIdentifiers) || (showHostOverview && !!hostEntityIdentifiers);

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
                    userName={userName ?? ''}
                    identityFields={userEntityIdentifiers}
                    entityRecord={
                      entityStoreV2Enabled ? userEntityFromStore.entityRecord : undefined
                    }
                  />
                </EuiFlexItem>
                <EuiSpacer size="s" />
              </>
            )}
            {showHostOverview && hostEntityIdentifiers && (
              <EuiFlexItem>
                <HostEntityOverview
                  hostName={hostName ?? ''}
                  identityFields={hostEntityIdentifiers}
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
