/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import { IconSparkles } from '../../../../common/icons/sparkles';
import * as i18n from './translations';

export const EMPTY_RESULTS_PROMPT_DATA_TEST_ID = 'emptyResultsPrompt';
export const EMPTY_RESULTS_MESSAGE_DATA_TEST_ID = 'emptyResultsMessage';
export const EMPTY_RESULTS_FOOTER_DATA_TEST_ID = 'emptyResultsFooter';
export const EMPTY_RESULTS_PROMPT_TITLE_TEST_ID = 'emptyResultsPromptTitle';
export const EMPTY_RESULTS_PROMPT_BODY_TEST_ID = 'emptyResultsPromptBody';
export const EMPTY_RESULTS_PROMPT_SCHEDULES_LINK_TEST_ID = 'schedulesLink';
export const LEARN_MORE_LINK_DATA_TEST_ID = 'learnMoreLink';
export const EMPTY_RESULTS_FOOTER_MESSAGE_ID = 'emptyResultsFooterMessage';

interface EmptyResultsPromptProps {
  /** Callback to open the schedules flyout */
  openSchedulesFlyout: () => void;
}

/**
 * Renders the empty results state for the attacks table.
 * It displays suggestions to help the user find results, such as adjusting the time range, filters, or checking schedules.
 */
export const EmptyResultsPrompt: React.FC<EmptyResultsPromptProps> = React.memo(
  ({ openSchedulesFlyout }) => (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj={EMPTY_RESULTS_PROMPT_DATA_TEST_ID}
      direction="column"
      gutterSize="none"
    >
      <EuiFlexItem data-test-subj={EMPTY_RESULTS_MESSAGE_DATA_TEST_ID} grow={false}>
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
      </EuiFlexItem>

      <EuiSpacer size="m" />

      <EuiFlexItem data-test-subj={EMPTY_RESULTS_FOOTER_DATA_TEST_ID} grow={false}>
        <EuiText size="s" data-test-subj={EMPTY_RESULTS_FOOTER_MESSAGE_ID}>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.attacks.emptyResults.footerMessage"
            defaultMessage="AI results may not always be accurate. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink
                  external={true}
                  data-test-subj={LEARN_MORE_LINK_DATA_TEST_ID}
                  href="https://www.elastic.co/guide/en/security/current/attack-discovery.html"
                  target="_blank"
                >
                  {i18n.LEARN_MORE}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);
EmptyResultsPrompt.displayName = 'EmptyResultsPrompt';
