/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import type { AxisStyle, Rotation } from '@elastic/charts';
import { ScaleType } from '@elastic/charts';
import styled from '@emotion/styled';
import { FormattedNumber } from '@kbn/i18n-react';
import numeral from '@elastic/numeral';
import { BarChart } from '../../../../common/components/charts/barchart';
import { LastUpdatedAt } from '../../../../common/components/last_updated_at';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { HeaderSection } from '../../../../common/components/header_section';
import {
  CASES,
  CASES_BY_STATUS_SECTION_TITLE,
  CASES_BY_STATUS_SECTION_TOOLTIP,
  STATUS_CLOSED,
  STATUS_IN_PROGRESS,
  STATUS_OPEN,
  VIEW_CASES,
} from '../translations';
import { LinkButton } from '../../../../common/components/links';
import { useCasesByStatus } from './use_cases_by_status';
import { SecurityPageName } from '../../../../../common/constants';
import { useFormatUrl } from '../../../../common/components/link_to';
import { appendSearch } from '../../../../common/components/link_to/helpers';
import { useNavigation } from '../../../../common/lib/kibana';

const CASES_BY_STATUS_ID = 'casesByStatus';

export const numberFormatter = (value: string | number): string => value.toLocaleString();

export const barchartConfigs = {
  series: {
    xScaleType: ScaleType.Ordinal,
    yScaleType: ScaleType.Linear,
    stackAccessors: ['g'],
    barSeriesStyle: {
      rect: {
        widthPixel: 22,
        opacity: 1,
      },
    },
  },
  axis: {
    xTickFormatter: numberFormatter,
    left: {
      style: {
        tickLine: {
          size: 0,
        },
        tickLabel: {
          padding: 16,
          fontSize: 14,
        },
      } as Partial<AxisStyle>,
    },
    bottom: {
      style: {
        tickLine: {
          size: 0,
        },
        tickLabel: {
          padding: 16,
          fontSize: 10.5,
        },
      } as Partial<AxisStyle>,
      labelFormat: (d: unknown) => numeral(d).format('0'),
    },
  },
  settings: {
    rotation: 90 as Rotation,
  },
  customHeight: 146,
};

const StyledEuiFlexItem = styled(EuiFlexItem)`
  align-items: center;
  width: 70%;
`;

const Wrapper = styled.div`
  width: 100%;
`;

const CasesByStatusComponent: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { toggleStatus, setToggleStatus } = useQueryToggle(CASES_BY_STATUS_ID);
  const { getAppUrl, navigateTo } = useNavigation();
  const { search } = useFormatUrl(SecurityPageName.case);
  const caseUrl = getAppUrl({ deepLinkId: SecurityPageName.case, path: appendSearch(search) });

  const goToCases = useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      navigateTo({ url: caseUrl });
    },
    [caseUrl, navigateTo]
  );
  const { closed, inProgress, isLoading, open, totalCounts, updatedAt } = useCasesByStatus({
    skip: !toggleStatus,
  });

  const barColors = useMemo(
    () => ({
      empty: euiTheme.colors.vis.euiColorVis8,
      open: euiTheme.colors.success,
      'in-progress': euiTheme.colors.primary,
      closed: euiTheme.colors.borderBaseSubdued,
    }),
    [
      euiTheme.colors.vis.euiColorVis8,
      euiTheme.colors.primary,
      euiTheme.colors.success,
      euiTheme.colors.borderBaseSubdued,
    ]
  );

  const chartData = useMemo(
    () => [
      {
        key: 'open',
        value: [{ y: open, x: STATUS_OPEN, g: STATUS_OPEN }],
        color: barColors.open,
      },
      {
        key: 'in-progress',
        value: [{ y: inProgress, x: STATUS_IN_PROGRESS, g: STATUS_IN_PROGRESS }],
        color: barColors['in-progress'],
      },
      {
        key: 'closed',
        value: [{ y: closed, x: STATUS_CLOSED, g: STATUS_CLOSED }],
        color: barColors.closed,
      },
    ],
    [barColors, closed, inProgress, open]
  );

  return (
    <EuiPanel hasBorder>
      <HeaderSection
        id={CASES_BY_STATUS_ID}
        title={CASES_BY_STATUS_SECTION_TITLE}
        titleSize="s"
        toggleStatus={toggleStatus}
        toggleQuery={setToggleStatus}
        subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
        showInspectButton={false}
        tooltip={CASES_BY_STATUS_SECTION_TOOLTIP}
      >
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <LinkButton href={caseUrl} onClick={goToCases}>
              {VIEW_CASES}
            </LinkButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </HeaderSection>
      {!isLoading && toggleStatus && (
        <EuiFlexGroup justifyContent="center" alignItems="center" direction="column" gutterSize="s">
          <EuiFlexItem>
            {totalCounts !== 0 && (
              <EuiText className="eui-textCenter" size="s" grow={false}>
                <>
                  <b>
                    <FormattedNumber value={totalCounts} />
                  </b>{' '}
                  <span> {CASES(totalCounts)}</span>
                </>
              </EuiText>
            )}
          </EuiFlexItem>
          <StyledEuiFlexItem grow={false}>
            <Wrapper data-test-subj="chart-wrapper">
              <BarChart configs={barchartConfigs} barChart={chartData} />
            </Wrapper>
          </StyledEuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};

export const CasesByStatus = React.memo(CasesByStatusComponent);
