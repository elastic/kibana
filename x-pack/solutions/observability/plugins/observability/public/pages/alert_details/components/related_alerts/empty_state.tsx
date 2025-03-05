/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, EuiImage } from '@elastic/eui';
import { icon } from '@elastic/eui/src/components/icon/assets';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export function EmptyState() {
  const heights = {
    tall: 490,
    short: 250,
  };
  const panelStyle = {
    maxWidth: 500,
  };

  return (
    <EuiPanel color="subdued" data-test-subj="relatedAlertsTabEmptyState">
      <EuiFlexGroup style={{ height: heights.tall }} alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder={true} style={panelStyle}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiText size="s">
                  <EuiTitle>
                    <h3>
                      <FormattedMessage
                        id="xpack.observability.pages.alertDetails.relatedAlerts.empty.title"
                        defaultMessage="Problem loading related alerts"
                      />
                    </h3>
                  </EuiTitle>
                  <p>
                    <FormattedMessage
                      id="xpack.observability.pages.alertDetails.relatedAlerts.empty.description"
                      defaultMessage="Due to an unexpected error, no related alerts can be found."
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiImage style={{ width: 200, height: 148 }} size="200" alt="" url={icon} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
