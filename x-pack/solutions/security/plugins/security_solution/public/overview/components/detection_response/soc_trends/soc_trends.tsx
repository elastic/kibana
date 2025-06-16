/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import styled from '@emotion/styled';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { SocTrendsDatePickerLock } from './date_picker_lock';
import { SuperDatePicker } from '../../../../common/components/super_date_picker';
import { LastUpdatedAt } from '../../../../common/components/last_updated_at';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { HeaderSection } from '../../../../common/components/header_section';
import * as i18n from './translations';
import type { StatState } from './hooks/use_soc_trends';
import { useSocTrends } from './hooks/use_soc_trends';

const SOC_TRENDS_ID = 'socTrends';

const StyledEuiPanel = styled(EuiPanel)`
  min-width: 300px;
`;
const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  max-width: 300px;
`;

interface Props {
  signalIndexName: string | null;
}

const getListItem = (stat: StatState) => ({
  title: (
    <EuiToolTip content={stat.description}>
      <EuiText>
        <h6>
          {stat.title} <EuiIcon type="questionInCircle" />
        </h6>
      </EuiText>
    </EuiToolTip>
  ),
  description: stat.isLoading ? (
    <EuiLoadingSpinner data-test-subj={`${stat.testRef}-stat-loading-spinner`} />
  ) : (
    <>
      {stat.stat}{' '}
      <EuiToolTip content={stat.percentage.note}>
        <EuiBadge color={stat.percentage.color}>
          {stat.percentage.percent != null ? stat.percentage.percent : '-'}
        </EuiBadge>
      </EuiToolTip>
    </>
  ),
});

const SocTrendsComponent = ({ signalIndexName }: Props) => {
  const { toggleStatus, setToggleStatus } = useQueryToggle(SOC_TRENDS_ID);
  const { stats, latestUpdate, isUpdating } = useSocTrends({
    skip: !toggleStatus,
    signalIndexName,
  });

  const listItems = useMemo(() => stats.map((stat) => getListItem(stat)), [stats]);

  return (
    <StyledEuiPanel hasBorder>
      <HeaderSection
        id={SOC_TRENDS_ID}
        showInspectButton={false}
        stackHeader={true}
        subtitle={<LastUpdatedAt updatedAt={latestUpdate} isUpdating={isUpdating} />}
        title={i18n.SOC_TRENDS}
        titleSize="s"
        toggleQuery={setToggleStatus}
        toggleStatus={toggleStatus}
      >
        <StyledEuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <SuperDatePicker
              id={InputsModelId.socTrends}
              showUpdateButton="iconOnly"
              width="auto"
              compressed
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SocTrendsDatePickerLock />
          </EuiFlexItem>
        </StyledEuiFlexGroup>
      </HeaderSection>
      {toggleStatus && (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={true}>
            <EuiDescriptionList
              data-test-subj={'statsList'}
              textStyle="reverse"
              listItems={listItems}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </StyledEuiPanel>
  );
};

export const SocTrends = React.memo(SocTrendsComponent);
