/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';

import { SecurityPageName } from '../../../common/constants';
import { HeaderPage } from '../../common/components/header_page';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { Actions } from './header/actions';
import { WorkflowsMissingPrivilegesCallOut } from './workflows_missing_privileges_callout';
import { useHasWorkflowsPrivileges } from './hooks/use_has_workflows_privileges';
import { PageTitle } from './page_title';
import { History } from './results/history';
import { MovingAttacksCallout } from './moving_attacks_callout';

import { useAttackDiscoveryControls } from './use_attack_discovery_controls';
import { useIsAlertsAndAttacksAlignmentEnabled } from '../../common/hooks/use_is_alerts_and_attacks_alignment_enabled';

export const ID = 'attackDiscoveryQuery';

const AttackDiscoveryPageComponent: React.FC = () => {
  const {
    aiConnectors,
    connectorId,
    isLoading,
    localStorageAttackDiscoveryMaxAlerts,
    onGenerate,
    openFlyout,
    settingsFlyout,
  } = useAttackDiscoveryControls();

  const { hasWorkflowsExecute, missingPrivileges } = useHasWorkflowsPrivileges();

  // for showing / hiding anonymized data:
  const [showAnonymized, setShowAnonymized] = useState<boolean>(false);

  const onToggleShowAnonymized = useCallback(() => setShowAnonymized((current) => !current), []);

  const pageTitle = useMemo(() => <PageTitle />, []);

  const enableAlertsAndAttacksAlignment = useIsAlertsAndAttacksAlignmentEnabled();

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
      `}
      data-test-subj="fullHeightContainer"
    >
      <div data-test-subj="attackDiscoveryPage">
        <HeaderPage border title={pageTitle}>
          <Actions
            hasWorkflowsExecute={hasWorkflowsExecute}
            isLoading={isLoading}
            onGenerate={onGenerate}
            openFlyout={openFlyout}
            isDisabled={connectorId == null}
          />
          <EuiSpacer size={'s'} />
        </HeaderPage>

        <EuiSpacer size="s" />

        <WorkflowsMissingPrivilegesCallOut missingPrivileges={missingPrivileges} />

        {enableAlertsAndAttacksAlignment && (
          <>
            <MovingAttacksCallout />
            <EuiSpacer size="s" />
          </>
        )}

        <History
          aiConnectors={aiConnectors}
          localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
          onGenerate={onGenerate}
          onToggleShowAnonymized={onToggleShowAnonymized}
          showAnonymized={showAnonymized}
        />

        {settingsFlyout}

        <SpyRoute pageName={SecurityPageName.attackDiscovery} />
      </div>
    </div>
  );
};

AttackDiscoveryPageComponent.displayName = 'AttackDiscoveryPage';

export const AttackDiscoveryPage = React.memo(AttackDiscoveryPageComponent);
