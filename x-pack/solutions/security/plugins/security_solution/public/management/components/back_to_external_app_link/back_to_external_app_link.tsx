/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { CommonProps } from '@elastic/eui';
import { EuiFlexGroup, EuiIcon, EuiLink } from '@elastic/eui';

import type { ListPageRouteState } from '../../../../common/endpoint/types';

import { useNavigateToAppEventHandler } from '../../../common/hooks/endpoint/use_navigate_to_app_event_handler';

export type BackToExternalAppLinkProps = CommonProps & ListPageRouteState;
export const BackToExternalAppLink = memo<BackToExternalAppLinkProps>(
  ({ backButtonLabel, backButtonUrl, onBackButtonNavigateTo, ...commonProps }) => {
    const handleBackOnClick = useNavigateToAppEventHandler(...onBackButtonNavigateTo);

    return (
      // eslint-disable-next-line @elastic/eui/href-or-on-click
      <EuiLink
        {...commonProps}
        data-test-subj="backToOrigin"
        href={backButtonUrl}
        onClick={handleBackOnClick}
      >
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiIcon type="arrowLeft" size="s" aria-hidden={true} />
          {backButtonLabel || (
            <FormattedMessage id="xpack.securitySolution.list.backButton" defaultMessage="Back" />
          )}
        </EuiFlexGroup>
      </EuiLink>
    );
  }
);

BackToExternalAppLink.displayName = 'BackToExternalAppLink';
