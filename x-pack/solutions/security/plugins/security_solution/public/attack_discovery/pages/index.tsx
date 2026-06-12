/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';

import {
  ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING,
  SecurityPageName,
} from '../../../common/constants';
import { HeaderPage } from '../../common/components/header_page';
import { useKibana } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { Actions } from './header/actions';
import { PageTitle } from './page_title';
import { History } from './results/history';
import { MovingAttacksCallout } from './moving_attacks_callout';

import { useAttackDiscoveryControls } from './use_attack_discovery_controls';

export const ID = 'attackDiscoveryQuery';

const AttackDiscoveryPageComponent: React.FC = () => {
  const {
    services: { uiSettings },
  } = useKibana();

  const {
    aiConnectors,
    connectorId,
    isLoading,
    localStorageAttackDiscoveryMaxAlerts,
    onGenerate,
    openFlyout,
    settingsFlyout,
  } = useAttackDiscoveryControls();

  // for showing / hiding anonymized data:
  const [showAnonymized, setShowAnonymized] = useState<boolean>(false);

  const onToggleShowAnonymized = useCallback(() => setShowAnonymized((current) => !current), []);

  const pageTitle = useMemo(() => <PageTitle />, []);

  const enableAlertsAndAttacksAlignment = uiSettings.get(
    ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING,
    false
  );

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
            isLoading={isLoading}
            onGenerate={onGenerate}
            openFlyout={openFlyout}
            isDisabled={connectorId == null}
          />
          <EuiSpacer size={'s'} />
        </HeaderPage>

        <EuiSpacer size="s" />

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
