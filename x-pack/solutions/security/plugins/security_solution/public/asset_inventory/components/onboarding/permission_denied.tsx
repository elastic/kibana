/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiImage, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AssetInventoryStatusResponse } from '../../../../common/api/asset_inventory/types';
import { MissingPrivilegesCallout } from '../../../entity_analytics/components/entity_store/components/missing_privileges_callout';
import illustration from '../../../common/images/lock_light.png';
import { CenteredWrapper } from './centered_wrapper';
import { EmptyStateIllustrationContainer } from '../empty_state_illustration_container';
import { TEST_SUBJ_ONBOARDING_PERMISSION_DENIED } from '../../constants';
import { NeedHelp } from './need_help';
import { AssetInventoryTitle } from '../asset_inventory_title';

interface PermissionDeniedProps {
  privileges?: AssetInventoryStatusResponse['privileges'];
}

export const PermissionDenied = ({ privileges }: PermissionDeniedProps) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <AssetInventoryTitle />
        <CenteredWrapper>
          <EuiEmptyPrompt
            data-test-subj={TEST_SUBJ_ONBOARDING_PERMISSION_DENIED}
            icon={
              <EmptyStateIllustrationContainer>
                <EuiImage
                  url={illustration}
                  size="fullWidth"
                  alt={i18n.translate(
                    'xpack.securitySolution.assetInventory.permissionDenied.illustrationAlt',
                    {
                      defaultMessage: 'Permission Denied',
                    }
                  )}
                />
              </EmptyStateIllustrationContainer>
            }
            title={
              <h2>
                <FormattedMessage
                  id="xpack.securitySolution.assetInventory.onboarding.permissionDenied.title"
                  defaultMessage="Permission Denied"
                />
              </h2>
            }
            layout="horizontal"
            color="plain"
            body={
              <>
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.assetInventory.onboarding.permissionDenied.description"
                    defaultMessage="You do not have the necessary permissions to enable or view the Asset Inventory. To access this feature, please contact your administrator to request the appropriate permissions."
                  />
                </p>
                {privileges ? <MissingPrivilegesCallout privileges={privileges} /> : null}
              </>
            }
            footer={<NeedHelp />}
          />
        </CenteredWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
