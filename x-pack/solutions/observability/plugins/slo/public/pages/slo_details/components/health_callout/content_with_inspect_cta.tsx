/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiFlexGroup, EuiLink, EuiIcon, EuiText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export function ContentWithInspectCta({
  url,
  textSize,
  content,
}: {
  url: string;
  textSize: 's' | 'xs';
  content: string;
}) {
  return (
    <EuiFlexGroup
      alignItems="flexStart"
      justifyContent="spaceBetween"
      gutterSize="xs"
      responsive={true}
    >
      <EuiFlexItem grow={false}>
        <EuiText size={textSize}>{content}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink data-test-subj="sloHealthCalloutInspectLink" href={url}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
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
    </EuiFlexGroup>
  );
}
