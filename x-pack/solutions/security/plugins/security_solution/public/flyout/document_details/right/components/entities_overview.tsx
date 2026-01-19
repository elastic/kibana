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
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { useDocumentDetailsContext } from '../../shared/context';
import { getField } from '../../shared/utils';
import { HostEntityOverview } from './host_entity_overview';
import { UserEntityOverview } from './user_entity_overview';
import { LeftPanelInsightsTab } from '../../left';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';

/**
 * Entities section under Insights section, overview tab. It contains a preview of host and user information.
 */
export const EntitiesOverview: React.FC = () => {
  const { getFieldsData, isPreviewMode } = useDocumentDetailsContext();
  const hostName = getField(getFieldsData('host.name'));
  const userName = getField(getFieldsData('user.name'));

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
        {userName || hostName ? (
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            {userName && (
              <>
                <EuiFlexItem>
                  <UserEntityOverview userName={userName} />
                </EuiFlexItem>
                <EuiSpacer size="s" />
              </>
            )}
            {hostName && (
              <EuiFlexItem>
                <HostEntityOverview hostName={hostName} />
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
