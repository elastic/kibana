/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSkeletonLoading,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useFindAttackDiscoverySchedules } from '../../../../../attack_discovery/pages/settings_flyout/schedule/logic/use_find_schedules';
import { WithSchedules } from './with_schedules';
import { NoSchedules } from './no_schedules';
import { ResetFilters } from './reset_filters';
import * as i18n from './translations';

export const EMPTY_RESULTS_CONTAINER_DATA_TEST_ID = 'emptyResultsContainer' as string;
export const EMPTY_RESULTS_MESSAGE_DATA_TEST_ID = 'emptyResultsMessage' as string;
export const EMPTY_RESULTS_FOOTER_DATA_TEST_ID = 'emptyResultsFooter' as string;
export const LEARN_MORE_LINK_DATA_TEST_ID = 'learnMoreLink' as string;
export const EMPTY_RESULTS_LOADING_SPINNER_TEST_ID = 'emptyResultsLoadingSpinner' as string;

interface EmptyResultsContainerProps {
  /** Whether there are any filters applied to the table (global search, page filters, etc.) */
  hasFilters: boolean;
  /** Callback to open the schedules flyout */
  openSchedulesFlyout: () => void;
}

/**
 * Renders the empty results state for the attacks table.
 * It displays different messages based on whether there are filters applied or if there are any schedules configured.
 */
export const EmptyResultsContainer: React.FC<EmptyResultsContainerProps> = React.memo(
  ({ hasFilters, openSchedulesFlyout }) => {
    // TODO: add separate endpoint/hook to fetch schedules stats/count
    const { data: { total } = { schedules: [], total: 0 }, isLoading: isSchedulesDataLoading } =
      useFindAttackDiscoverySchedules({ disableToast: true });

    const promptComponent = useMemo(() => {
      if (hasFilters) {
        return <ResetFilters />;
      } else if (total > 0) {
        return <WithSchedules openSchedulesFlyout={openSchedulesFlyout} />;
      }
      return <NoSchedules openSchedulesFlyout={openSchedulesFlyout} />;
    }, [hasFilters, openSchedulesFlyout, total]);

    const content = useMemo(() => {
      return (
        <EuiFlexGroup
          alignItems="center"
          data-test-subj={EMPTY_RESULTS_CONTAINER_DATA_TEST_ID}
          direction="column"
          gutterSize="none"
        >
          <EuiFlexItem data-test-subj={EMPTY_RESULTS_MESSAGE_DATA_TEST_ID} grow={false}>
            {promptComponent}
          </EuiFlexItem>

          <EuiSpacer size="xxl" />

          <EuiFlexItem data-test-subj={EMPTY_RESULTS_FOOTER_DATA_TEST_ID} grow={false}>
            <EuiText size="s">
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
      );
    }, [promptComponent]);

    return (
      <EuiSkeletonLoading
        isLoading={isSchedulesDataLoading}
        loadingContent={
          <div data-test-subj={EMPTY_RESULTS_LOADING_SPINNER_TEST_ID}>
            <EuiSkeletonRectangle height={50} width="100%" />
            <EuiSpacer />
            <EuiSkeletonRectangle height={275} width="100%" />
          </div>
        }
        loadedContent={content}
      />
    );
  }
);
EmptyResultsContainer.displayName = 'EmptyResultsContainer';
