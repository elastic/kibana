/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useAppUrl } from '../../../../../common/lib/kibana';
import type { BackToExternalAppButtonProps } from '../../../../components/back_to_external_app_button/back_to_external_app_button';
import { BackToExternalAppButton } from '../../../../components/back_to_external_app_button/back_to_external_app_button';
import { getPoliciesPath } from '../../../../common/routing';
import { APP_UI_ID } from '../../../../../../common';
import type { PolicyDetailsRouteState } from '../../../../../../common/endpoint/types';

export const BackToPolicyListButton = memo<{ backLink?: PolicyDetailsRouteState['backLink'] }>(
  ({ backLink }) => {
    const { getAppUrl } = useAppUrl();

    const backLinkOptions = useMemo<BackToExternalAppButtonProps>(() => {
      if (backLink) {
        const { navigateTo, label, href } = backLink;
        return {
          onBackButtonNavigateTo: navigateTo,
          backButtonLabel: label,
          backButtonUrl: href,
        };
      }

      // the default back button is to the policy list
      const policyListPath = getPoliciesPath();

      return {
        backButtonLabel: i18n.translate('xpack.securitySolution.endpoint.list.backToPolicyButton', {
          defaultMessage: 'Back to policy list',
        }),
        backButtonUrl: getAppUrl({ path: policyListPath }),
        onBackButtonNavigateTo: [
          APP_UI_ID,
          {
            path: policyListPath,
          },
        ],
      };
    }, [getAppUrl, backLink]);

    if (!backLink) {
      return null;
    }
    return <BackToExternalAppButton {...backLinkOptions} data-test-subj="endpointListBackLink" />;
  }
);

BackToPolicyListButton.displayName = 'BackToPolicyListButton';
