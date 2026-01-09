/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { css } from '@emotion/react';
import { IconSparkles } from '../../../../../common/icons/sparkles';
import * as i18n from './translations';

interface EmptyResultsContainerProps {
  /** Callback to open the schedules flyout */
  openSchedulesFlyout: () => void;
}

export const EMPTY_RESULTS_PROMPT_TITLE_TEST_ID = 'emptyResultsPromptTitle';
export const EMPTY_RESULTS_PROMPT_BODY_TEST_ID = 'emptyResultsPromptBody';
export const EMPTY_RESULTS_PROMPT_SCHEDULES_LINK_TEST_ID = 'schedulesLink';

/**
 * Renders the prompt for the empty results state, suggesting actions to the user.
 */
export const EmptyResultsPrompt: React.FC<EmptyResultsContainerProps> = React.memo(
  ({ openSchedulesFlyout }) => (
    <EuiEmptyPrompt
      icon={<IconSparkles />}
      title={
        <h2 data-test-subj={EMPTY_RESULTS_PROMPT_TITLE_TEST_ID}>
          {i18n.NO_RESULTS_MATCH_YOUR_SEARCH}
        </h2>
      }
      body={
        <EuiFlexGroup
          alignItems="center"
          data-test-subj={EMPTY_RESULTS_PROMPT_BODY_TEST_ID}
          direction="column"
          gutterSize="none"
          responsive={false}
        >
          <EuiFlexItem
            css={css`
              display: inline-flex;
              text-align: left;
            `}
            grow={false}
          >
            <span>{i18n.HERE_ARE_SOME_THINGS_TO_TRY}</span>

            <ul
              css={css`
                text-align: left;
              `}
            >
              <li>
                <span>{i18n.EXPAND_THE_TIME_RANGE}</span>
              </li>
              <li>
                <span>{i18n.CHECK_FILTERS_CONTROLS_SEARCH_BAR}</span>
              </li>
              <li>
                <FormattedMessage
                  id="xpack.securitySolution.detectionEngine.attacks.emptyResults.confirmScheduledLabel"
                  defaultMessage="Confirm attack discoveries are {schedulesLink}"
                  values={{
                    schedulesLink: (
                      <EuiLink
                        data-test-subj={EMPTY_RESULTS_PROMPT_SCHEDULES_LINK_TEST_ID}
                        onClick={openSchedulesFlyout}
                      >
                        <FormattedMessage
                          id="xpack.securitySolution.detectionEngine.attacks.emptyResults.confirmScheduledLink"
                          defaultMessage="scheduled"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </li>
            </ul>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  )
);
EmptyResultsPrompt.displayName = 'EmptyResultsPrompt';
