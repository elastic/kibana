/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { i18n } from '@kbn/i18n';

export function HealthCalloutContentWithCTA({
  textSize,
  content,
  url,
  isMissing = false,
  handleReset,
}: {
  textSize: 's' | 'xs';
  content: string;
  url: string;
  isMissing?: boolean;
  handleReset?: () => void;
}) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size={textSize}>{content}</EuiText>
      </EuiFlexItem>
      {!isMissing ? (
        <EuiFlexItem grow={false}>
          <EuiLink data-test-subj="sloHealthCalloutInspectLink" href={url}>
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              gutterSize="xs"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type="inspect" color="danger" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size={textSize} color="danger">
                  <FormattedMessage
                    id="xpack.slo.sloDetails.healthCallout.buttonTransformLabel"
                    defaultMessage="Inspect"
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiLink>
        </EuiFlexItem>
      ) : (
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
      )}
    </EuiFlexGroup>
  );
}
