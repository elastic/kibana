/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLogReadinessTask } from '@kbn/siem-readiness';
import { EuiPageHeader, EuiPageSection, EuiEmptyPrompt, EuiText, EuiButton } from '@elastic/eui';

const SiemReadinessDashboard = () => {
  const { logReadinessTask } = useLogReadinessTask();

  const handleLogTask = useCallback(async () => {
    logReadinessTask({ task_id: '1', status: 'complete', meta: { demo: 'demo_data' } });
  }, [logReadinessTask]);

  return (
    <>
      <EuiPageHeader pageTitle="SIEM Readiness" bottomBorder={true} />
      <EuiPageSection>
        <EuiEmptyPrompt
          iconType="managementApp"
          title={
            <h2>
              <FormattedMessage
                id="xpack.securitySolution.siemReadiness.wipTitle"
                defaultMessage="Work in Progress"
              />
            </h2>
          }
          body={
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.siemReadiness.wipUpperBody"
                  defaultMessage="This page is a placeholder for the SIEM Readiness Dashboard, which is currently under development."
                />
              </p>
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.siemReadiness.wipLowerBody"
                  defaultMessage="It will help you get a comprehensive view of your security posture and guide you through key steps to improve your readiness."
                />
              </p>
            </EuiText>
          }
          actions={
            <EuiButton color="primary" fill onClick={handleLogTask}>
              <FormattedMessage
                id="xpack.securitySolution.siemReadiness.logTestTask"
                defaultMessage="Log Test Task"
              />
            </EuiButton>
          }
        />
      </EuiPageSection>
    </>
  );
};

SiemReadinessDashboard.displayName = 'SiemReadinessDashboard';

// eslint-disable-next-line import/no-default-export
export default SiemReadinessDashboard;
