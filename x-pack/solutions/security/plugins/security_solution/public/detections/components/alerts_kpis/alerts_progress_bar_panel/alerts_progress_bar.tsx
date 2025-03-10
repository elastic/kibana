/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiProgress,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { TableId } from '@kbn/securitysolution-data-table';
import type { AlertsProgressBarData, GroupBySelection } from './types';
import type { AddFilterProps } from '../common/types';
import { getAggregateData } from './helpers';
import * as i18n from './translations';
import {
  SecurityCellActionType,
  CellActionsMode,
  SecurityCellActionsTrigger,
  SecurityCellActions,
} from '../../../../common/components/cell_actions';
import { getSourcererScopeId } from '../../../../helpers';

const ProgressWrapper = styled.div`
  height: 160px;
`;

const StyledEuiHorizontalRule = styled(EuiHorizontalRule)`
  margin-top: 0;
  margin-bottom: ${({ theme }) => theme.eui.euiSizeS};
`;

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  margin-top: -${({ theme }) => theme.eui.euiSizeM};
`;

const StyledEuiProgress = styled(EuiProgress)`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeS};
`;

const DataStatsWrapper = styled.div`
  width: 250px;
`;

const EmptyAction = styled.div`
  padding-left: ${({ theme }) => theme.eui.euiSizeL};
`;

/**
 * Individual progress bar per row
 */
const ProgressBarRow: React.FC<{ item: AlertsProgressBarData }> = ({ item }) => {
  const { euiTheme } = useEuiTheme();
  const color = useMemo(
    () =>
      euiTheme.themeName === 'EUI_THEME_BOREALIS'
        ? euiTheme.colors.vis.euiColorVis6
        : euiTheme.colors.vis.euiColorVis9,
    [euiTheme]
  );

  return (
    <EuiProgress
      valueText={
        <EuiText size="xs" color="default">
          <strong>{item.percentageLabel}</strong>
        </EuiText>
      }
      max={1}
      color={color}
      size="s"
      value={item.percentage}
      label={
        item.key === 'Other' ? (
          item.label
        ) : (
          <EuiText size="xs" className="eui-textTruncate">
            {item.key}
          </EuiText>
        )
      }
    />
  );
};

export interface AlertsProcessBarProps {
  data: AlertsProgressBarData[];
  isLoading: boolean;
  addFilter?: ({ field, value, negate }: AddFilterProps) => void;
  groupBySelection: GroupBySelection;
}

export const AlertsProgressBar: React.FC<AlertsProcessBarProps> = ({
  data,
  isLoading,
  addFilter,
  groupBySelection,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onButtonClick = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const [nonEmpty, formattedNonEmptyPercent] = useMemo(() => getAggregateData(data), [data]);
  const sourcererScopeId = useMemo(() => getSourcererScopeId(TableId.alertsOnAlertsPage), []);

  const dataStatsButton = (
    <EuiButtonIcon
      color="text"
      iconType="iInCircle"
      aria-label="info"
      size="xs"
      onClick={onButtonClick}
    />
  );

  const dataStatsMessage = (
    <DataStatsWrapper>
      <EuiPopoverTitle>{i18n.DATA_STATISTICS_TITLE(formattedNonEmptyPercent)}</EuiPopoverTitle>
      <EuiText size="s">
        {i18n.DATA_STATISTICS_MESSAGE(groupBySelection)}
        <EuiLink
          color="primary"
          onClick={() => {
            setIsPopoverOpen(false);
            if (addFilter) {
              addFilter({ field: groupBySelection, value: null, negate: true });
            }
          }}
        >
          {i18n.NON_EMPTY_FILTER(groupBySelection)}
        </EuiLink>
      </EuiText>
    </DataStatsWrapper>
  );

  return (
    <>
      <StyledEuiFlexGroup alignItems="center" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiText size="s" data-test-subj="alerts-progress-bar-title">
            <h5>{groupBySelection}</h5>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={dataStatsButton}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            anchorPosition="rightCenter"
            panelPaddingSize="s"
          >
            {dataStatsMessage}
          </EuiPopover>
        </EuiFlexItem>
      </StyledEuiFlexGroup>
      {isLoading ? (
        <StyledEuiProgress size="xs" color="primary" />
      ) : (
        <>
          <StyledEuiHorizontalRule />
          <ProgressWrapper data-test-subj="progress-bar" className="eui-yScroll">
            {nonEmpty === 0 ? (
              <>
                <EuiText size="s" textAlign="center" data-test-subj="empty-proress-bar">
                  {i18n.EMPTY_DATA_MESSAGE}
                </EuiText>
                <EuiSpacer size="l" />
              </>
            ) : (
              <>
                {data
                  .filter((item) => item.key !== '-')
                  .map((item) => (
                    <div key={`${item.key}`} data-test-subj={`progress-bar-${item.key}`}>
                      <EuiFlexGroup alignItems="center" gutterSize="xs">
                        <EuiFlexItem>
                          <ProgressBarRow item={item} />
                        </EuiFlexItem>
                        <EuiFlexItem
                          grow={false}
                          data-test-subj={`progress-bar-${item.key}-actions`}
                        >
                          {item.key !== 'Other' ? (
                            <SecurityCellActions
                              mode={CellActionsMode.INLINE}
                              visibleCellActions={0}
                              triggerId={SecurityCellActionsTrigger.DEFAULT}
                              data={{ field: groupBySelection, value: item.key }}
                              sourcererScopeId={sourcererScopeId}
                              metadata={{ scopeId: TableId.alertsOnAlertsPage }}
                              disabledActionTypes={[SecurityCellActionType.SHOW_TOP_N]}
                              extraActionsIconType="boxesVertical"
                              extraActionsColor="text"
                            />
                          ) : (
                            <EmptyAction />
                          )}
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer size="s" />
                    </div>
                  ))}
              </>
            )}
            <EuiSpacer size="s" />
          </ProgressWrapper>
        </>
      )}
    </>
  );
};

AlertsProgressBar.displayName = 'AlertsProgressBar';
