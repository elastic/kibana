/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';
import { ResetCta } from './reset_cta';
import { InspectCta } from './inspect_cta';

export function HealthCalloutContentWithCTA({
  textSize,
  content,
  url = '',
  isMissing = false,
  handleReset,
}: {
  textSize: 's' | 'xs';
  content: string;
  url?: string;
  isMissing?: boolean;
  handleReset?: () => void;
}) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size={textSize}>{content}</EuiText>
      </EuiFlexItem>
      {!isMissing ? (
        <InspectCta textSize={textSize} url={url} />
      ) : (
        <ResetCta textSize={textSize} handleReset={handleReset!} />
      )}
    </EuiFlexGroup>
  );
}
