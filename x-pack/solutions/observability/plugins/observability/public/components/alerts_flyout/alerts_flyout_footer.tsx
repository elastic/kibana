/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../utils/kibana_react';
import { paths } from '../../../common/locators/paths';
import type { TopAlert } from '../../typings/alerts';

interface FlyoutProps {
  alert: TopAlert;
  id?: string;
}

export function AlertsFlyoutFooter({ alert, isInApp }: FlyoutProps & { isInApp: boolean }) {
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;
  const [viewInAppUrl, setViewInAppUrl] = useState<string>();

  useEffect(() => {
    if (!alert.hasBasePath) {
      setViewInAppUrl(prepend(alert.link ?? ''));
    } else {
      setViewInAppUrl(alert.link);
    }
  }, [alert.hasBasePath, alert.link, prepend]);

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="flexEnd">
        {!alert.link || isInApp ? null : (
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="alertsFlyoutViewInAppButton" fill href={viewInAppUrl}>
              {i18n.translate('xpack.observability.alertsFlyout.viewInAppButtonText', {
                defaultMessage: 'View in app',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="alertsFlyoutAlertDetailsButton"
            fill
            href={
              prepend &&
              prepend(paths.observability.alertDetails(alert.fields['kibana.alert.uuid']))
            }
          >
            {i18n.translate('xpack.observability.alertsFlyout.alertsDetailsButtonText', {
              defaultMessage: 'Alert details',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
}
