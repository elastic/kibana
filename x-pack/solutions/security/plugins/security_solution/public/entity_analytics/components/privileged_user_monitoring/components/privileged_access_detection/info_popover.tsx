/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiLink,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import React, { useCallback } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/css';
import { useIntegrationLinkState } from '../../../../../common/hooks/integrations/use_integration_link_state';
import { ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH } from '../../../../../../common/constants';
import { addPathParamToUrl } from '../../../../../common/utils/integrations';
import { INTEGRATION_APP_ID } from '../../../../../common/lib/integrations/constants';
import { useKibana, useNavigation } from '../../../../../common/lib/kibana';
import { usePrivilegedAccessDetectionIntegration } from '../../../privileged_user_monitoring_onboarding/hooks/use_integrations';

export const PrivilegedAccessInfoPopover = () => {
  const { docLinks } = useKibana().services;
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);
  const entityAnalyticsLinks = docLinks.links.securitySolution.entityAnalytics;
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

  const button = <EuiButtonIcon iconType="info" onClick={togglePopover} aria-label={'oi'} />;

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiPopoverTitle>
        <EuiTitle size="xs">
          <h4>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedAccessDetection.infoPopover.title"
              defaultMessage="Top privileged access anomalies"
            />
          </h4>
        </EuiTitle>
      </EuiPopoverTitle>

      <EuiText
        size="s"
        className={css`
          max-width: 530px;
        `}
      >
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.privilegedAccessDetection.infoPopover.description"
          defaultMessage="{link} helps to detect anomalous privileged access activity in the Windows, Linux, and Okta system logs."
          values={{
            link: (
              <EuiLink onClick={navigateToPadIntegration}>
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedAccessDetection.infoPopover.linkText"
                  defaultMessage="The Privileged access detection ML package"
                />
              </EuiLink>
            ),
          }}
        />
        <p>
          {
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedAccessDetection.infoPopover.swimLanesDescription"
              defaultMessage="Swim lanes provide an overview of the data buckets analyzed within the selected time period. A swim lane reflects the top 10 privileged users based on their anomaly scores, showing the highest anomaly score for that user in each block."
            />
          }
        </p>
        <p>
          {
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedAccessDetection.infoPopover.swimLanesColorDescription"
              defaultMessage="Each block in a swim lane is colored based on its anomaly score (0–100). High scores are shown in red, while low scores are shown in blue."
            />
          }
        </p>
      </EuiText>

      <EuiPopoverFooter>
        <EuiLink
          target="_blank"
          rel="noopener nofollow noreferrer"
          href={entityAnalyticsLinks.mlAnomalyDetection}
        >
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedAccessDetection.infoPopover.learnMoreLink"
            defaultMessage="Learn more about anomaly detection"
          />
        </EuiLink>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
