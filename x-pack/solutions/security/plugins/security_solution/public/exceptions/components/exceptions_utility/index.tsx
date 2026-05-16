/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Pagination } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';

import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import {
  UtilityBar,
  UtilityBarSection,
  UtilityBarGroup,
  UtilityBarText,
} from '../../../common/components/utility_bar';

const myUtilitiesStyles = css`
  height: 50px;
`;

const styledConditionStyles = css`
  display: inline-block !important;
  vertical-align: middle !important;
  line-height: 1;
`;
interface ExceptionsUtilityComponentProps {
  dataTestSubj?: string;
  exceptionsTitle?: string;
  pagination: Pagination & { pageSize: number };
  // Corresponds to last time exception items were fetched
  lastUpdated: string | number | null;
}
// This component should be removed and moved to @kbn/securitysolution-exception-list-components
// once all the building components get moved

const ExceptionsUtilityComponent: FC<ExceptionsUtilityComponentProps> = ({
  dataTestSubj,
  pagination,
  lastUpdated,
  exceptionsTitle,
}) => {
  const { euiTheme } = useEuiTheme();
  const styledTextStyles = css`
    font-weight: bold;
    color: ${euiTheme.colors.textParagraph};
  `;
  const { pageSize, totalItemCount } = pagination;
  return (
    <EuiFlexGroup css={myUtilitiesStyles} alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <UtilityBar>
          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarText dataTestSubj={`${dataTestSubj}ShowingText`}>
                <FormattedMessage
                  id="xpack.securitySolution.exceptions.viewer.paginationDetails"
                  defaultMessage="Showing {partOne} of {partTwo}"
                  values={{
                    partOne: (
                      <span css={styledTextStyles}>{`1-${Math.min(
                        pageSize,
                        totalItemCount
                      )}`}</span>
                    ),
                    partTwo: <span css={styledTextStyles}>{`${totalItemCount}`}</span>,
                  }}
                />
              </UtilityBarText>
              {exceptionsTitle && (
                <span css={styledTextStyles} data-test-subj={`${dataTestSubj}exceptionsTitle`}>
                  {exceptionsTitle}
                </span>
              )}
            </UtilityBarGroup>
          </UtilityBarSection>
        </UtilityBar>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" data-test-subj={`${dataTestSubj}LastUpdated`}>
          <FormattedMessage
            id="xpack.securitySolution.exceptions.viewer.lastUpdated"
            defaultMessage="Updated {updated}"
            values={{
              updated: (
                <span css={styledConditionStyles}>
                  <FormattedRelativePreferenceDate
                    value={lastUpdated}
                    tooltipAnchorClassName="eui-textTruncate"
                  />
                </span>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ExceptionsUtilityComponent.displayName = 'ExceptionsUtilityComponent';

export const ExceptionsUtility = React.memo(ExceptionsUtilityComponent);

ExceptionsUtility.displayName = 'ExceptionsUtility';
