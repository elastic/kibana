/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiLink,
  EuiIcon,
  EuiText,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiPanel,
  EuiFlexItem,
} from '@elastic/eui';
import React from 'react';
import type { DocsPanelProps } from '../types';

interface OnboardingDocPanelProps {
  doc: DocsPanelProps;
  telemetryPrefix: string;
}

export const OnboardingDocPanel = ({ doc, telemetryPrefix }: OnboardingDocPanelProps) => {
  return (
    <EuiPanel hasShadow={false} paddingSize="none" color="transparent">
      <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="documentation" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiTitle size="xs">
            <h3>{doc.title}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>{doc.description}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiLink
        href={doc.docsHref}
        external
        target="_blank"
        data-test-subj={`vectordbWizardDocsPanelLink-${doc.id}`}
        data-telemetry-id={`${telemetryPrefix}-docsPanelLink-${doc.id}`}
      >
        {doc.docsLabel}
      </EuiLink>
    </EuiPanel>
  );
};
