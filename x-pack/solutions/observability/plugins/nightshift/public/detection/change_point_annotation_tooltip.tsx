/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import { useFormatTimestamp } from '../common/format_timestamp';

export function ChangePointAnnotationTooltip({
  changePointLabel,
  timestamp,
}: {
  changePointLabel: string;
  /** ISO timestamp or millis; formatted with the Kibana dateFormat advanced setting. */
  timestamp: string | number;
}): React.ReactElement {
  const formatTimestamp = useFormatTimestamp();
  const formatted =
    typeof timestamp === 'number'
      ? formatTimestamp(new Date(timestamp).toISOString())
      : formatTimestamp(timestamp);

  return (
    <EuiPanel paddingSize="s" hasShadow={true}>
      <EuiText size="xs">
        <strong>{changePointLabel}</strong>
      </EuiText>
      <EuiText size="xs" color="subdued">
        {formatted}
      </EuiText>
    </EuiPanel>
  );
}
