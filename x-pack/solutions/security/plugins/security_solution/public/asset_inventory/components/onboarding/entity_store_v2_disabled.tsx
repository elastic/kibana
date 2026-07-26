/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCode,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import illustration from '../../../common/images/lock_light.png';
import { AssetInventoryTitle } from '../asset_inventory_title';
import { CenteredWrapper } from './centered_wrapper';
import { EmptyStateIllustrationContainer } from '../empty_state_illustration_container';
import { TEST_SUBJ_ONBOARDING_ENTITY_STORE_V2_DISABLED } from '../../constants';
import { NeedHelp } from './need_help';

export const EntityStoreV2Disabled = () => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <AssetInventoryTitle />
        <CenteredWrapper>
          <EuiEmptyPrompt
            data-test-subj={TEST_SUBJ_ONBOARDING_ENTITY_STORE_V2_DISABLED}
            icon={
              <EmptyStateIllustrationContainer>
                <EuiImage
                  url={illustration}
                  size="fullWidth"
                  alt={i18n.translate(
                    'xpack.securitySolution.assetInventory.entityStoreV2Disabled.illustrationAlt',
                    {
                      defaultMessage: 'Entity Store v2 required',
                    }
                  )}
                />
              </EmptyStateIllustrationContainer>
            }
            title={
              <h2>
                <FormattedMessage
                  id="xpack.securitySolution.assetInventory.onboarding.entityStoreV2Disabled.title"
                  defaultMessage="Entity Store v2 is required"
                />
              </h2>
            }
            layout="horizontal"
            color="plain"
            body={
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.assetInventory.onboarding.entityStoreV2Disabled.description"
                    defaultMessage="Asset Inventory is powered by Entity Store v2. To continue, ask your administrator to enable both prerequisites:"
                  />
                </p>
                <ul>
                  <li>
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.onboarding.entityStoreV2Disabled.uiSetting"
                      defaultMessage="The {setting} advanced setting."
                      values={{
                        setting: <EuiCode>{'securitySolution:entityStoreEnableV2'}</EuiCode>,
                      }}
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.onboarding.entityStoreV2Disabled.experimentalFlag"
                      defaultMessage="The {flag} experimental flag (added to {config} in {file})."
                      values={{
                        flag: <EuiCode>{'entityAnalyticsEntityStoreV2'}</EuiCode>,
                        config: <EuiCode>{'xpack.securitySolution.enableExperimental'}</EuiCode>,
                        file: <EuiCode>{'kibana.yml'}</EuiCode>,
                      }}
                    />
                  </li>
                </ul>
              </EuiText>
            }
            footer={<NeedHelp />}
          />
        </CenteredWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
