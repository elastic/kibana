/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiIcon,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { CsvUploadManageDataSource } from './csv_upload_manage_data_source';
import { HeaderPage } from '../../../common/components/header_page';
import { useSpaceId } from '../../../common/hooks/use_space_id';

export interface AddDataSourceResult {
  successful: boolean;
  userCount: number;
}

export const PrivilegedUserMonitoringManageDataSources = ({
  onBackToDashboardClicked,
}: {
  onBackToDashboardClicked: () => void;
}) => {
  const spaceId = useSpaceId();
  const [addDataSourceResult, setAddDataSourceResult] = useState<AddDataSourceResult | undefined>();

  return (
    <>
      <EuiButtonEmpty
        flush={'left'}
        iconType={'arrowLeft'}
        iconSide={'left'}
        onClick={onBackToDashboardClicked}
      >
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.back"
          defaultMessage={'Back to privileged user monitoring'}
        />
      </EuiButtonEmpty>
      <HeaderPage
        border={true}
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.title"
            defaultMessage={'Manage data sources'}
          />
        }
      />
      {addDataSourceResult?.successful && (
        <>
          <EuiCallOut
            title={i18n.translate(
              'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.successMessage',
              {
                defaultMessage:
                  'New data source of privileged users successfully set up: {userCount} users added',
                values: { userCount: addDataSourceResult.userCount },
              }
            )}
            color="success"
            iconType={'check'}
          />
          <EuiSpacer size={'l'} />
        </>
      )}
      <EuiFlexGroup alignItems={'flexStart'} direction={'column'}>
        <EuiFlexGroup gutterSize={'s'} alignItems={'center'}>
          <EuiIcon size={'l'} type={'indexOpen'} />
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.indices"
                defaultMessage="Indices"
              />
            </h1>
          </EuiText>
        </EuiFlexGroup>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.indices.text"
              defaultMessage="One or more indices containing the user.name field. All user names in the indices, specified in the user.name field, will be defined as privileged users."
            />
          </p>
          <h4>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.indices.noIndicesAdded"
              defaultMessage="No indices added"
            />
          </h4>
        </EuiText>
        <EuiButton fullWidth={false} iconType={'plusInCircle'}>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.indices.text"
            defaultMessage="Select index"
          />
        </EuiButton>
      </EuiFlexGroup>
      <EuiSpacer size={'xxl'} />
      {spaceId && (
        <CsvUploadManageDataSource
          setAddDataSourceResult={setAddDataSourceResult}
          namespace={spaceId}
        />
      )}
    </>
  );
};
