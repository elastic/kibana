/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { CsvUploadManageDataSource } from './csv_upload_manage_data_source';
import { HeaderPage } from '../../../common/components/header_page';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { IndexImportManageDataSource } from './index_import_manage_data_source';
import { IntegrationsManageDataSource } from './integrations_manage_data_source';

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
        flush="left"
        iconType="arrowLeft"
        iconSide="left"
        onClick={onBackToDashboardClicked}
        aria-label={i18n.translate(
          'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.backAriaLabel',
          {
            defaultMessage: 'Back to privileged user monitoring',
          }
        )}
      >
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.back"
          defaultMessage="Back to privileged user monitoring"
        />
      </EuiButtonEmpty>
      <HeaderPage
        border={true}
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.title"
            defaultMessage="Manage data sources"
          />
        }
      />
      {addDataSourceResult?.successful && (
        <>
          <EuiCallOut
            announceOnMount
            title={
              addDataSourceResult.userCount > 0
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.successMessage',
                    {
                      defaultMessage:
                        'New data source of privileged users successfully set up: {userCount} users added',
                      values: { userCount: addDataSourceResult.userCount },
                    }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.successMessageWithoutUserCount',
                    {
                      defaultMessage: 'New data source of privileged users successfully set up',
                    }
                  )
            }
            color="success"
            iconType="check"
          />
          <EuiSpacer size="l" />
        </>
      )}

      <IntegrationsManageDataSource />
      <EuiSpacer size="xxl" />
      <IndexImportManageDataSource setAddDataSourceResult={setAddDataSourceResult} />
      <EuiSpacer size="xxl" />
      {spaceId && (
        <CsvUploadManageDataSource
          setAddDataSourceResult={setAddDataSourceResult}
          namespace={spaceId}
        />
      )}
    </>
  );
};
