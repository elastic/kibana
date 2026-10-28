/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiLink, EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useGetUrlParams, useUrlParams } from '../../hooks';
import { deletePackagePolicy } from '../../state/monitor_management/api';
import { MonitorNotFoundPrompt } from '../monitor_details/monitor_not_found_page';

export const EditMonitorNotFound: React.FC = () => {
  return (
    <>
      <LeftoverIntegrationFound />
      <EuiSpacer size="m" />
      <MonitorNotFoundPrompt />
    </>
  );
};

const LeftoverIntegrationFound: React.FC = () => {
  const { packagePolicyId } = useGetUrlParams();
  const updateUrlParams = useUrlParams()[1];

  const [isDeleting, setIsDeleting] = useState(false);

  const { data, loading, error } = useFetcher(() => {
    if (!packagePolicyId || !isDeleting) return;
    return deletePackagePolicy(packagePolicyId);
  }, [isDeleting, packagePolicyId]);

  useEffect(() => {
    if (isDeleting && data && !loading) {
      updateUrlParams({ packagePolicyId: undefined }, true);
      setIsDeleting(false);
    }
  }, [data, isDeleting, loading, updateUrlParams]);

  if (!packagePolicyId) return null;

  if (error) {
    return (
      <KbnDangerCallout
        data-test-subj="syntheticsLeftoverIntegrationDeleteError"
        title={i18n.translate('xpack.synthetics.leftOver.errors.deleteFailedTitle', {
          defaultMessage: 'Unable to delete integration',
        })}
        text={<p>{(error as IHttpFetchError<ResponseErrorBody>).body?.message ?? error.message}</p>}
      />
    );
  }

  return (
    <KbnWarningCallout
      title="Leftover integration found"
      text={
        <p>
          <FormattedMessage
            id="xpack.synthetics.leftOver.errors.title"
            defaultMessage="Please click on the button below to delete the integration. Normally this should not happen.
        Since the monitor has been deleted, the integration was supposed to be deleted automatically. If
        this happens often, report it by "
          />
          <EuiLink
            data-test-subj="syntheticsLeftoverIntegrationFoundCreatingAnIssueLink"
            href="https://github.com/elastic/kibana/issues/new/choose"
          >
            <FormattedMessage
              id="xpack.synthetics.leftOver.errors.createIssue"
              defaultMessage="creating an issue."
            />
          </EuiLink>
        </p>
      }
      actionProps={{
        primary: {
          'data-test-subj': 'syntheticsUseMonitorNotFoundDeleteIntegrationButton',
          isLoading: loading && isDeleting,
          onClick: () => {
            setIsDeleting(true);
          },
          children: (
            <FormattedMessage
              id="xpack.synthetics.leftOver.errors.delete"
              defaultMessage="Delete integration"
            />
          ),
        },
      }}
    />
  );
};
