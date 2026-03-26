/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexItem, EuiText, type EuiTextProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface RunscriptActionNoOutputProps {
  textSize?: Exclude<EuiTextProps['size'], 'm' | 'relative'>;
  'data-test-subj'?: string;
}

export const RunscriptActionNoOutput = memo<RunscriptActionNoOutputProps>(
  ({ textSize = 's', 'data-test-subj': dataTestSubj }) => (
    <EuiFlexItem>
      <EuiText size={textSize} data-test-subj={dataTestSubj}>
        {i18n.translate(
          'xpack.securitySolution.endpointResponseActions.runScriptAction.noOutputMessage',
          {
            defaultMessage:
              'The output for this runscript action cannot be displayed. Please download the output file to view the results.',
          }
        )}
      </EuiText>
    </EuiFlexItem>
  )
);

RunscriptActionNoOutput.displayName = 'RunscriptActionNoOutput';
