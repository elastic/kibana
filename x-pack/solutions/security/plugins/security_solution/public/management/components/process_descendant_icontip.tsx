/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { CommonProps } from '@elastic/eui';
import { EuiIconTip, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';
import { PROCESS_DESCENDANT_EXTRA_ENTRY_TEXT } from '../../../common/endpoint/service/artifacts/constants';

interface ProcessDescendantsIconTipProps extends CommonProps {
  tooltipText: string | React.ReactNode;
  versionInfo: string | React.ReactNode;
  indicateExtraEntry?: boolean;
}

export const ProcessDescendantsIconTip = memo<ProcessDescendantsIconTipProps>(
  ({
    tooltipText,
    versionInfo,
    indicateExtraEntry = false,
    'data-test-subj': dataTestSubj,
    ...commonProps
  }: ProcessDescendantsIconTipProps) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <EuiIconTip
        {...commonProps}
        content={
          <EuiText size="s">
            <p>{tooltipText}</p>
            {indicateExtraEntry && (
              <>
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.processDescendantsTooltip.extraEntry"
                    defaultMessage="Note: the following additional condition is applied:"
                  />
                </p>
                <p>
                  <code>{PROCESS_DESCENDANT_EXTRA_ENTRY_TEXT}</code>
                </p>
              </>
            )}
            <p>{versionInfo}</p>
          </EuiText>
        }
        data-test-subj={getTestId('tooltipText')}
        iconProps={{ 'data-test-subj': getTestId('tooltipIcon') }}
        type="info"
      />
    );
  }
);

ProcessDescendantsIconTip.displayName = 'ProcessDescendantsIconTip';
