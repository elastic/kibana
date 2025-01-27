/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiCallOut, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../common/constants';
import { getEndpointListPath } from '../../../management/common/routing';
import { useNavigateToAppEventHandler } from '../../../common/hooks/endpoint/use_navigate_to_app_event_handler';

export const EndpointNotice = memo<{ onDismiss: () => void }>(({ onDismiss }) => {
  const { getUrlForApp } = useKibana().services.application;
  const endpointsPath = getEndpointListPath({ name: 'endpointList' });
  const endpointsLink = getUrlForApp(APP_UI_ID, { path: endpointsPath });
  const handleGetStartedClick = useNavigateToAppEventHandler(APP_UI_ID, {
    path: endpointsPath,
  });

  return (
    <EuiCallOut
      data-test-subj="endpoint-prompt-banner"
      iconType="cheer"
      title={
        <>
          <b>
            <FormattedMessage
              id="xpack.securitySolution.overview.endpointNotice.introducing"
              defaultMessage="Introducing: "
            />
          </b>
          <FormattedMessage
            id="xpack.securitySolution.overview.endpointNotice.title"
            defaultMessage="Endpoint Security"
          />
        </>
      }
    >
      <>
        <p>
          <FormattedMessage
            id="xpack.securitySolution.overview.endpointNotice.message"
            defaultMessage="Protect your hosts with threat prevention, detection, and deep security data visibility."
          />
        </p>
        {/* eslint-disable-next-line @elastic/eui/href-or-on-click*/}
        <EuiButton onClick={handleGetStartedClick} href={endpointsLink}>
          <FormattedMessage
            id="xpack.securitySolution.overview.endpointNotice.tryButton"
            defaultMessage="Try Endpoint Security"
          />
        </EuiButton>
        <EuiButtonEmpty onClick={onDismiss}>
          <FormattedMessage
            id="xpack.securitySolution.overview.endpointNotice.dismiss"
            defaultMessage="Dismiss message"
          />
        </EuiButtonEmpty>
      </>
    </EuiCallOut>
  );
});
EndpointNotice.displayName = 'EndpointNotice';
