/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useNavigation } from '@kbn/security-solution-navigation';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiText } from '@elastic/eui';
import { useIntegrationLinkState } from '../../../../../../common/hooks/integrations/use_integration_link_state';
import { ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH } from '../../../../../../../common/constants';
import { usePrivilegedAccessDetectionIntegration } from '../../../../privileged_user_monitoring_onboarding/hooks/use_integrations';
import { INTEGRATION_APP_ID } from '../../../../../../common/lib/integrations/constants';
import { addPathParamToUrl } from '../../../../../../common/utils/integrations';

export const PrivilegedAccessDetectionMLPopoverHeader: React.FC = () => {
  const state = useIntegrationLinkState(ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH);
  const { navigateTo } = useNavigation();
  const padPackage = usePrivilegedAccessDetectionIntegration();
  const navigateToPadIntegration = useCallback(() => {
    navigateTo({
      appId: INTEGRATION_APP_ID,
      path: addPathParamToUrl(
        `/detail/${padPackage?.name}-${padPackage?.version}/overview`,
        ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH
      ),
      state,
    });
  }, [navigateTo, padPackage, state]);

  return (
    <EuiText>
      <p>
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.padMlJobsDescription"
          defaultMessage="Run privileged access detection jobs to monitor anomalous behaviors of privileged users in your environment. Note that some jobs may require additional manual steps configured in order to fully function. See the {integrationLink} for details"
          values={{
            integrationLink: (
              <EuiLink external onClick={navigateToPadIntegration}>
                {'Privileged access detection integration'}
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  );
};
