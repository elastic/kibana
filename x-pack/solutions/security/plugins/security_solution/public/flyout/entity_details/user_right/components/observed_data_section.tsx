/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiTitle, useEuiFontSize, useEuiTheme } from '@elastic/eui';

import type { Dispatch, ReactElement, SetStateAction } from 'react';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useInstalledSecurityJobNameById } from '../../../../common/components/ml/hooks/use_installed_security_jobs';
import { ONE_WEEK_IN_HOURS } from '../../shared/constants';
import { ObservedEntity } from '../../shared/components/observed_entity';
import { useObservedUser } from '../hooks/use_observed_user';
import { useObservedUserItems } from '../hooks/use_observed_user_items';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { InspectButton, InspectButtonContainer } from '../../../../common/components/inspect';
import { useAnomaliesTableData } from '../../../../common/components/ml/anomaly/use_anomalies_table_data';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { getCriteriaFromUsersType } from '../../../../common/components/ml/criteria/get_criteria_from_users_type';
import { UsersType } from '../../../../explore/users/store/model';

const CLOSED = 'closed' as const;
const OPEN = 'open' as const;

export const ObservedDataSection = memo(
  ({
    userName,
    contextID,
    scopeId,
    queryId,
  }: {
    userName: string;
    contextID: string;
    scopeId: string;
    queryId: string;
  }) => {
    const { euiTheme } = useEuiTheme();

    const [expandedState, setExpandedState] = useState<typeof CLOSED | typeof OPEN>(CLOSED);
    const renderContent = expandedState === OPEN;
    const onToggle = useCallback(
      (isOpen: boolean) => setExpandedState(isOpen ? OPEN : CLOSED),
      [setExpandedState]
    );

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [extraAction, setExtraAction] = useState<ReactElement | null | undefined>(null);

    const buttonContent = (
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.observedDataTitle"
            defaultMessage="Observed data"
          />
        </h3>
      </EuiTitle>
    );

    return (
      <InspectButtonContainer>
        <EuiAccordion
          onToggle={onToggle}
          initialIsOpen={false}
          isLoading={isLoading}
          id="observedEntity-accordion"
          data-test-subj="observedEntity-accordion"
          buttonProps={{
            'data-test-subj': 'observedEntity-accordion-button',
            css: css`
              color: ${euiTheme.colors.primary};
            `,
          }}
          buttonContent={buttonContent}
          extraAction={extraAction}
          css={css`
            .euiAccordion__optionalAction {
              margin-left: auto;
            }
          `}
        >
          {renderContent && (
            <ObservedDataSectionContent
              userName={userName}
              contextID={contextID}
              scopeId={scopeId}
              queryId={queryId}
              setIsLoading={setIsLoading}
              setExtraAction={setExtraAction}
            />
          )}
        </EuiAccordion>
      </InspectButtonContainer>
    );
  }
);
ObservedDataSection.displayName = 'ObservedDataSection';

const ObservedDataSectionContent = memo(
  ({
    userName,
    contextID,
    scopeId,
    queryId,
    setIsLoading,
    setExtraAction,
  }: {
    userName: string;
    contextID: string;
    scopeId: string;
    queryId: string;
    setIsLoading: Dispatch<SetStateAction<boolean>>;
    setExtraAction: Dispatch<SetStateAction<ReactElement | null | undefined>>;
  }) => {
    const { to, from, isInitializing } = useGlobalTime();

    const observedUser = useObservedUser(userName, scopeId);

    const { jobNameById } = useInstalledSecurityJobNameById();
    const jobIds = useMemo(() => Object.keys(jobNameById), [jobNameById]);
    const [isLoadingAnomaliesData, anomaliesData] = useAnomaliesTableData({
      criteriaFields: getCriteriaFromUsersType(UsersType.details, userName),
      startDate: from,
      endDate: to,
      skip: isInitializing,
      jobIds,
      aggregationInterval: 'auto',
    });

    setIsLoading(isLoadingAnomaliesData);

    const observedUserWithAnomalies = {
      ...observedUser,
      anomalies: {
        isLoading: isLoadingAnomaliesData,
        anomalies: anomaliesData,
        jobNameById,
      },
    };
    const observedFields = useObservedUserItems(observedUserWithAnomalies);

    const { euiTheme } = useEuiTheme();
    const xsFontSize = useEuiFontSize('xxs').fontSize;

    setExtraAction(
      <>
        <span
          css={css`
            margin-right: ${euiTheme.size.s};
          `}
        >
          <InspectButton
            queryId={queryId}
            title={
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.observedDataInspectTitle"
                defaultMessage="Observed data"
              />
            }
          />
        </span>
        {observedUser.lastSeen.date && (
          <span
            css={css`
              font-size: ${xsFontSize};
            `}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.observedEntityUpdatedTime"
              defaultMessage="Updated {time}"
              values={{
                time: (
                  <FormattedRelativePreferenceDate
                    value={observedUser.lastSeen.date}
                    dateFormat="MMM D, YYYY"
                    relativeThresholdInHrs={ONE_WEEK_IN_HOURS}
                  />
                ),
              }}
            />
          </span>
        )}
      </>
    );

    return (
      <ObservedEntity
        observedData={observedUserWithAnomalies}
        contextID={contextID}
        scopeId={scopeId}
        observedFields={observedFields}
      />
    );
  }
);
ObservedDataSectionContent.displayName = 'ObservedDataSectionContent';
