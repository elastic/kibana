/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiFlexGroup, EuiIcon, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export function ContentWithResetCta({
  textSize,
  content,
  handleReset,
}: {
  textSize: 's' | 'xs';
  content: string;
  handleReset: () => void;
}) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size={textSize}>{content}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="xs"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="refresh" color="subdued" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText
              size={textSize}
              color="subdued"
              onClick={handleReset}
              css={{ cursor: 'pointer' }}
            >
              <FormattedMessage
                id="xpack.slo.sloDetails.healthCallout.buttonTransformMissingLabel"
                defaultMessage="Reset"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
