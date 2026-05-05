/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useParams } from 'react-router-dom';
import { useGetUrlParams } from '../../hooks';

export function RemoteMonitorCallout() {
  const { remoteName, remoteKibanaUrl, locationId } = useGetUrlParams();
  const { monitorId: configId } = useParams<{ monitorId: string }>();

  const remoteMonitorUrl = useMemo(() => {
    if (!remoteKibanaUrl) return undefined;
    const baseUrl = remoteKibanaUrl.replace(/\/+$/, '');
    const locParam = locationId ? `?locationId=${locationId}` : '';
    return `${baseUrl}/app/synthetics/monitor/${configId}${locParam}`;
  }, [remoteKibanaUrl, configId, locationId]);

  if (!remoteName) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={REMOTE_MONITOR_TITLE}
        data-test-subj="syntheticsRemoteMonitorCallout"
      >
        <p>
          {remoteKibanaUrl ? (
            <FormattedMessage
              id="xpack.synthetics.monitorDetails.remoteCallout.descriptionWithUrl"
              defaultMessage="This is a remote monitor fetched from the remote cluster: {remoteName} with Kibana URL {kibanaUrl}. Some actions like editing and deleting are not available for remote monitors."
              values={{
                remoteName: <strong>{remoteName}</strong>,
                kibanaUrl: (
                  <EuiLink
                    data-test-subj="syntheticsRemoteMonitorCalloutKibanaLink"
                    href={remoteKibanaUrl}
                    target="_blank"
                  >
                    {remoteKibanaUrl}
                  </EuiLink>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.synthetics.monitorDetails.remoteCallout.description"
              defaultMessage="This is a remote monitor fetched from the remote cluster: {remoteName}. Some actions like editing and deleting are not available for remote monitors."
              values={{
                remoteName: <strong>{remoteName}</strong>,
              }}
            />
          )}
        </p>
        {remoteMonitorUrl && (
          <EuiButton
            href={remoteMonitorUrl}
            color="primary"
            target="_blank"
            iconType="external"
            data-test-subj="syntheticsRemoteMonitorViewButton"
          >
            {VIEW_REMOTE_MONITOR_DETAILS}
          </EuiButton>
        )}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
}

const REMOTE_MONITOR_TITLE = i18n.translate(
  'xpack.synthetics.monitorDetails.remoteCallout.title',
  {
    defaultMessage: 'Remote monitor',
  }
);

const VIEW_REMOTE_MONITOR_DETAILS = i18n.translate(
  'xpack.synthetics.monitorDetails.remoteCallout.viewButton',
  {
    defaultMessage: 'View remote monitor details',
  }
);
