/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiCallOut,
  EuiPanel,
  EuiEmptyPrompt,
  EuiLoadingLogo,
  EuiToolTip,
  EuiButton,
  EuiImage,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UseQueryResult } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useMutation } from '@kbn/react-query';

import type { GetEntityStoreStatusResponse } from '../../../../../common/api/entity_analytics/entity_store/status.gen';
import type {
  RiskEngineStatusResponse,
  StoreStatus,
} from '../../../../../common/api/entity_analytics';
import { RiskEngineStatusEnum } from '../../../../../common/api/entity_analytics';

import { useEnableEntityStoreMutation } from '../hooks/use_entity_store';
import {
  ENABLEMENT_INITIALIZING_RISK_ENGINE,
  ENABLEMENT_INITIALIZING_ENTITY_STORE,
  ENABLE_ALL_TITLE,
  ENABLEMENT_DESCRIPTION_BOTH,
  ENABLE_RISK_SCORE_TITLE,
  ENABLEMENT_DESCRIPTION_RISK_ENGINE_ONLY,
  ENABLE_ENTITY_STORE_TITLE,
  ENABLEMENT_DESCRIPTION_ENTITY_STORE_ONLY,
} from '../translations';
import { EnablementConfirmationModal } from './enablement_modal';
import dashboardEnableImg from '../../../images/entity_store_dashboard.png';
import { useEntityStoreTypes } from '../../../hooks/use_enabled_entity_types';
import { useToggleEntityAnalytics } from '../../../hooks/use_toggle_entity_analytics';
import { useConfigurableRiskEngineSettings } from '../../risk_score_management/hooks/risk_score_configurable_risk_engine_settings_hooks';

interface EnableEntityStorePanelProps {
  state: {
    riskEngine: UseQueryResult<RiskEngineStatusResponse>;
    entityStore: UseQueryResult<GetEntityStoreStatusResponse>;
  };
}

export const EnablementPanel: React.FC<EnableEntityStorePanelProps> = ({ state }) => {
  const riskEngineStatus = state.riskEngine.data?.risk_engine_status;
  const entityStoreStatus = state.entityStore.data?.status;
  const engines = state.entityStore.data?.engines;
  const enabledEntityTypes = useEntityStoreTypes();

  const [modalVisible, setModalVisible] = useState(false);

  const {
    selectedSettingsMatchSavedSettings,
    saveSelectedSettingsMutation,
    selectedRiskEngineSettings,
  } = useConfigurableRiskEngineSettings();

  const saveSettingsWrapperMutation = useMutation(async () => {
    if (selectedRiskEngineSettings) {
      await saveSelectedSettingsMutation.mutateAsync(selectedRiskEngineSettings);
    }
  });

  const { toggle, isLoading: isToggling } = useToggleEntityAnalytics({
    selectedSettingsMatchSavedSettings,
    saveSelectedSettingsMutation: saveSettingsWrapperMutation,
  });

  const storeEnablement = useEnableEntityStoreMutation();

  const handleConfirmEnable = async () => {
    setModalVisible(false);
    await toggle();
  };

  const installedTypes = engines?.map((engine) => engine.type);
  const uninstalledTypes = enabledEntityTypes.filter(
    (type) => !(installedTypes || []).includes(type)
  );

  const enableUninstalledEntityStore = () => {
    storeEnablement.mutate({ entityTypes: uninstalledTypes });
  };

  if (storeEnablement.error) {
    return (
      <EuiCallOut
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStore.enablement.mutation.errorTitle"
            defaultMessage={'There was a problem initializing the entity store'}
          />
        }
        color="danger"
        iconType="error"
      >
        <p>{storeEnablement.error.body.message}</p>
      </EuiCallOut>
    );
  }

  if (isToggling) {
    return (
      <EuiPanel hasBorder data-test-subj="riskEngineInitializingPanel">
        <EuiEmptyPrompt
          icon={<EuiLoadingLogo logo="logoElastic" size="xl" />}
          title={<h2>{ENABLEMENT_INITIALIZING_RISK_ENGINE}</h2>}
        />
      </EuiPanel>
    );
  }

  if (entityStoreStatus === 'installing' || storeEnablement.isLoading) {
    return (
      <EuiPanel hasBorder data-test-subj="entityStoreInitializingPanel">
        <EuiEmptyPrompt
          icon={<EuiLoadingLogo logo="logoElastic" size="xl" />}
          title={<h2>{ENABLEMENT_INITIALIZING_ENTITY_STORE}</h2>}
          body={
            <p>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.entityStore.enablement.initializing.description"
                defaultMessage="This can take up to 5 minutes."
              />
            </p>
          }
        />
      </EuiPanel>
    );
  }

  if (entityStoreStatus === 'running' && uninstalledTypes.length > 0) {
    const title = i18n.translate(
      'xpack.securitySolution.entityAnalytics.entityStore.enablement.moreEntityTypesTitle',
      {
        defaultMessage: 'More entity types available',
      }
    );

    return (
      <EuiEmptyPrompt
        css={{ minWidth: '100%' }}
        hasBorder
        layout="horizontal"
        actions={
          <EuiToolTip content={title}>
            <EuiButton
              color="primary"
              fill
              onClick={enableUninstalledEntityStore}
              data-test-subj={`entityStoreEnablementButton`}
            >
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.entityStore.enablement.enableButton"
                defaultMessage="Enable"
              />
            </EuiButton>
          </EuiToolTip>
        }
        icon={<EuiImage size="l" hasShadow src={dashboardEnableImg} alt={title} />}
        data-test-subj="entityStoreEnablementPanel"
        title={<h2>{title}</h2>}
        body={
          <p>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStore.enablement.moreEntityTypes"
              defaultMessage={
                'Enable missing types in the entity store to capture even more entities observed in events'
              }
            />
          </p>
        }
      />
    );
  }

  if (
    riskEngineStatus !== RiskEngineStatusEnum.NOT_INSTALLED &&
    entityStoreStatus !== 'not_installed'
  ) {
    return null;
  }

  const [title, body] = getEnablementTexts(entityStoreStatus, riskEngineStatus);
  return (
    <>
      <EuiEmptyPrompt
        css={{ minWidth: '100%' }}
        hasBorder
        layout="horizontal"
        title={<h2>{title}</h2>}
        body={<p>{body}</p>}
        actions={
          <EuiToolTip content={title}>
            <EuiButton
              color="primary"
              fill
              onClick={() => setModalVisible(true)}
              data-test-subj={`entityStoreEnablementButton`}
            >
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.entityStore.enablement.enableButton"
                defaultMessage="Enable"
              />
            </EuiButton>
          </EuiToolTip>
        }
        icon={<EuiImage size="l" hasShadow src={dashboardEnableImg} alt={title} />}
        data-test-subj="entityStoreEnablementPanel"
      />

      <EnablementConfirmationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirmEnable}
      />
    </>
  );
};

const getEnablementTexts = (
  entityStoreStatus?: StoreStatus,
  riskEngineStatus?: RiskEngineStatusResponse['risk_engine_status']
): [string, string] => {
  if (
    (entityStoreStatus === 'not_installed' || entityStoreStatus === 'stopped') &&
    riskEngineStatus === RiskEngineStatusEnum.NOT_INSTALLED
  ) {
    return [ENABLE_ALL_TITLE, ENABLEMENT_DESCRIPTION_BOTH];
  }

  if (riskEngineStatus === RiskEngineStatusEnum.NOT_INSTALLED) {
    return [ENABLE_RISK_SCORE_TITLE, ENABLEMENT_DESCRIPTION_RISK_ENGINE_ONLY];
  }

  return [ENABLE_ENTITY_STORE_TITLE, ENABLEMENT_DESCRIPTION_ENTITY_STORE_ONLY];
};
