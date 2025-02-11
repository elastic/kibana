/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/css';
import type { EntityDetailsPath } from '../../shared/components/left_panel/left_panel_header';
import { UserAssetTableType } from '../../../../explore/users/store/model';
import type { ManagedUserFields } from '../../../../../common/search_strategy/security_solution/users/managed_details';
import { ManagedUserDatasetKey } from '../../../../../common/search_strategy/security_solution/users/managed_details';
import * as i18n from '../translations';

import { BasicTable } from '../../../../common/components/ml/tables/basic_table';
import { getManagedUserTableColumns } from '../utils/columns';

import type { ManagedUserData } from '../types';
import { INSTALL_EA_INTEGRATIONS_HREF } from '../constants';
import { MANAGED_USER_QUERY_ID } from '../../shared/constants';
import { InspectButton, InspectButtonContainer } from '../../../../common/components/inspect';
import { useAppUrl } from '../../../../common/lib/kibana';
import { ManagedUserAccordion } from './managed_user_accordion';
import { useManagedUserItems } from '../hooks/use_managed_user_items';

const accordionStyle = css`
  width: 100%;
`;

export const ManagedUser = ({
  managedUser,
  contextID,
  openDetailsPanel,
  isPreviewMode,
  isLinkEnabled,
}: {
  managedUser: ManagedUserData;
  contextID: string;
  openDetailsPanel: (path: EntityDetailsPath) => void;
  isPreviewMode?: boolean;
  isLinkEnabled: boolean;
}) => {
  const entraManagedUser = managedUser.data?.[ManagedUserDatasetKey.ENTRA];
  const oktaManagedUser = managedUser.data?.[ManagedUserDatasetKey.OKTA];
  const { getAppUrl } = useAppUrl();
  const installedIntegrationHref = useMemo(
    () => getAppUrl({ appId: 'integrations', path: INSTALL_EA_INTEGRATIONS_HREF }),
    [getAppUrl]
  );

  return (
    <>
      <InspectButtonContainer>
        <EuiAccordion
          isLoading={managedUser.isLoading}
          initialIsOpen={true}
          id={'managedUser-data'}
          data-test-subj="managedUser-data"
          buttonProps={{
            'data-test-subj': 'managedUser-accordion-button',
          }}
          buttonContent={
            <EuiTitle size="xs">
              <h5>{i18n.MANAGED_DATA_TITLE}</h5>
            </EuiTitle>
          }
          extraAction={
            <InspectButton
              queryId={MANAGED_USER_QUERY_ID}
              title={i18n.MANAGED_USER_INSPECT_TITLE}
            />
          }
          className={accordionStyle}
        >
          <EuiSpacer size="m" />

          <FormattedMessage
            id="xpack.securitySolution.timeline.userDetails.managed.description"
            defaultMessage="Metadata from any asset repository integrations enabled in your environment."
          />

          <EuiSpacer size="m" />

          {!managedUser.isLoading && !managedUser.isIntegrationEnabled ? (
            <EuiPanel
              data-test-subj="managedUser-integration-disable-callout"
              hasShadow={false}
              hasBorder={true}
            >
              <EuiEmptyPrompt
                title={<h2>{i18n.NO_ACTIVE_INTEGRATION_TITLE}</h2>}
                titleSize="s"
                body={<p>{i18n.NO_ACTIVE_INTEGRATION_TEXT}</p>}
                actions={
                  <EuiButton fill href={installedIntegrationHref}>
                    {i18n.ADD_EXTERNAL_INTEGRATION_BUTTON}
                  </EuiButton>
                }
              />
            </EuiPanel>
          ) : (
            <>
              {!entraManagedUser && !oktaManagedUser && !managedUser.isLoading ? (
                <EuiCallOut
                  data-test-subj="managedUser-no-data"
                  title={i18n.NO_MANAGED_DATA_TITLE}
                  color="warning"
                  iconType="help"
                >
                  <p>{i18n.NO_MANAGED_DATA_TEXT}</p>
                </EuiCallOut>
              ) : (
                <>
                  {entraManagedUser && entraManagedUser.fields && (
                    <ManagedUserAccordion
                      title={i18n.ENTRA_DATA_PANEL_TITLE}
                      managedUser={entraManagedUser.fields}
                      tableType={UserAssetTableType.assetEntra}
                      openDetailsPanel={openDetailsPanel}
                      isLinkEnabled={isLinkEnabled}
                      isPreviewMode={isPreviewMode}
                    >
                      <ManagedUserTable
                        contextID={contextID}
                        managedUser={entraManagedUser.fields}
                        tableType={UserAssetTableType.assetEntra}
                      />
                    </ManagedUserAccordion>
                  )}

                  {entraManagedUser && oktaManagedUser && <EuiSpacer size="m" />}

                  {oktaManagedUser && oktaManagedUser.fields && (
                    <ManagedUserAccordion
                      title={i18n.OKTA_DATA_PANEL_TITLE}
                      managedUser={oktaManagedUser.fields}
                      tableType={UserAssetTableType.assetOkta}
                      openDetailsPanel={openDetailsPanel}
                      isLinkEnabled={isLinkEnabled}
                      isPreviewMode={isPreviewMode}
                    >
                      <ManagedUserTable
                        contextID={contextID}
                        managedUser={oktaManagedUser.fields}
                        tableType={UserAssetTableType.assetOkta}
                      />
                    </ManagedUserAccordion>
                  )}
                </>
              )}
            </>
          )}
        </EuiAccordion>
      </InspectButtonContainer>
    </>
  );
};

export const ManagedUserTable = ({
  managedUser,
  contextID,
  tableType,
}: {
  managedUser: ManagedUserFields;
  contextID: string;
  tableType: UserAssetTableType;
}) => {
  const managedUserTableColumns = useMemo(() => getManagedUserTableColumns(contextID), [contextID]);
  const managedItems = useManagedUserItems(tableType, managedUser);

  return (
    <BasicTable
      data-test-subj="managedUser-table"
      columns={managedUserTableColumns}
      items={managedItems ?? []}
    />
  );
};
