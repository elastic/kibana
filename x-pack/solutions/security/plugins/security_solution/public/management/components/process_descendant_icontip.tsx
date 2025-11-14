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
  indicateExtraEntry?: boolean;
  isEventFilterForm?: boolean;
}

export const ProcessDescendantsIconTip = memo<ProcessDescendantsIconTipProps>(
  ({
    indicateExtraEntry = false,
    'data-test-subj': dataTestSubj,
    isEventFilterForm = true,
    ...commonProps
  }: ProcessDescendantsIconTipProps) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <EuiIconTip
        {...commonProps}
        content={
          <EuiText size="s">
            <p>
              {isEventFilterForm ? (
                <FormattedMessage
                  id="xpack.securitySolution.processDescendantsTooltip.eventFilters.content"
                  defaultMessage="Filtering the descendants of a process means that events from the matched process are ingested, but events from its descendant processes are omitted."
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.processDescendantsTooltip.trustedApps.content"
                  defaultMessage="When enabled, all child processes of a trusted parent process also become Trusted Applications. Supported by Elastic Agent v9.2+."
                />
              )}
            </p>
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
            {isEventFilterForm && (
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.processDescendantsTooltip.versionInfo"
                  defaultMessage="Process descendant filtering works only with Agents v8.15 and newer."
                />
              </p>
            )}
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
