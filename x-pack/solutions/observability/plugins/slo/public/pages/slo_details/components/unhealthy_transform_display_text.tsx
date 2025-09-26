/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import kbnRison from '@kbn/rison';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useKibana } from '../../../hooks/use_kibana';

const getTransformUrlQueryState = (transformId: string) => {
  return kbnRison.encode({
    queryText: transformId,
  });
};

export function TransformDisplayText({
  textSize,
  transformId,
}: {
  textSize: 's' | 'xs';
  transformId: string;
}) {
  const { http } = useKibana().services;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size={textSize} color="danger">
          {transformId}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink
          data-test-subj="sloHealthCalloutInspectTransformLink"
          href={http?.basePath.prepend(
            `/app/management/data/transform/?_a=${getTransformUrlQueryState(transformId)}`
          )}
        >
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="inspect" color="danger" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size={textSize} color="danger">
                <FormattedMessage
                  id="xpack.slo.sloDetails.healthCallout.buttonTransformLabel"
                  defaultMessage="Inspect transform"
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
