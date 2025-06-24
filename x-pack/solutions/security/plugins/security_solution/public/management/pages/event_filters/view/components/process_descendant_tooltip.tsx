/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { CommonProps } from '@elastic/eui';
import { EuiToolTip, EuiText, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { PROCESS_DESCENDANT_EVENT_FILTER_EXTRA_ENTRY_TEXT } from '../../../../../../common/endpoint/service/artifacts/constants';

interface ProcessDescendantsTooltipProps extends CommonProps {
  indicateExtraEntry?: boolean;
}

export const ProcessDescendantsTooltip = memo<ProcessDescendantsTooltipProps>(
  ({
    indicateExtraEntry = false,
    'data-test-subj': dataTestSubj,
    ...commonProps
  }: ProcessDescendantsTooltipProps) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <EuiToolTip
        {...commonProps}
        content={
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.filterProcessDescendants.tooltip"
                defaultMessage="Filtering the descendants of a process means that events from the matched process are ingested, but events from its descendant processes are omitted."
              />
            </p>
            {indicateExtraEntry && (
              <>
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.eventFilters.filterProcessDescendants.tooltipExtraEntry"
                    defaultMessage="Note: the following additional condition is applied:"
                  />
                </p>
                <p>
                  <code>{PROCESS_DESCENDANT_EVENT_FILTER_EXTRA_ENTRY_TEXT}</code>
                </p>
              </>
            )}
            <p>
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.filterProcessDescendants.tooltipVersionInfo"
                defaultMessage="Process descendant filtering works only with Agents v8.15 and newer."
              />
            </p>
          </EuiText>
        }
        data-test-subj={getTestId('tooltipText')}
      >
        <EuiIcon type="iInCircle" data-test-subj={getTestId('tooltipIcon')} />
      </EuiToolTip>
    );
  }
);
ProcessDescendantsTooltip.displayName = 'ProcessDescendantsTooltip';
