/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  getDefaultEuiMarkdownProcessingPlugins,
} from '@elastic/eui';

import { CrawlerDomainValidationStep } from '../../../../../api/crawler/types';

import { domainValidationStateToPanelColor } from './utils';
import { ValidationStateIcon } from './validation_state_icon';

interface ValidationStepPanelProps {
  action?: React.ReactNode;
  label: string;
  step: CrawlerDomainValidationStep;
}

const processingPlugins = getDefaultEuiMarkdownProcessingPlugins();
processingPlugins[1][1].components.a = (props) => <EuiLink {...props} target="_blank" />;

export const ValidationStepPanel: React.FC<ValidationStepPanelProps> = ({
  step,
  label,
  action,
}) => {
  const showErrorMessage = step.state === 'invalid' || step.state === 'warning';

  return (
    <EuiPanel hasShadow={false} color={domainValidationStateToPanelColor(step.state)}>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <ValidationStateIcon state={step.state} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{label}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      {showErrorMessage && (
        <>
          <EuiSpacer size="xs" />
          <EuiMarkdownFormat
            textSize="s"
            data-test-subj="errorMessage"
            processingPluginList={processingPlugins}
          >
            {step.message || ''}
          </EuiMarkdownFormat>
          {action && (
            <>
              <EuiSpacer size="s" />
              {action}
            </>
          )}
        </>
      )}
    </EuiPanel>
  );
};
