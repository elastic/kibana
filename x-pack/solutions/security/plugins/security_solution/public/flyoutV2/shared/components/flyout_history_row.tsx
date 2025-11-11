/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  type EuiIconProps,
  EuiSkeletonText,
  useEuiTheme,
} from '@elastic/eui';
import type { FlyoutPanelHistory } from '@kbn/flyout';
import { useFlyoutApi } from '@kbn/flyout';
import { EasePanelKeyV2 } from '../../ease/constants/panel_keys';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { DocumentDetailsRightPanelKeyV2 } from '../../document_details/shared/constants/panel_keys';
import { useBasicDataFromDetailsData } from '../../document_details/shared/hooks/use_basic_data_from_details_data';
import { useEventDetails } from '../../document_details/shared/hooks/use_event_details';
import { getAlertTitle, getEventTitle, getField } from '../../document_details/shared/utils';
import { RulePanelKeyV2 } from '../../rule_details/right';
import { NetworkPanelKeyV2 } from '../../network_details';
import { useRuleDetails } from '../../rule_details/hooks/use_rule_details';
import {
  DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID,
  GENERIC_HISTORY_ROW_TEST_ID,
  HISTORY_ROW_LOADING_TEST_ID,
  HOST_HISTORY_ROW_TEST_ID,
  MISCONFIGURATION_HISTORY_ROW_TEST_ID,
  NETWORK_HISTORY_ROW_TEST_ID,
  RULE_HISTORY_ROW_TEST_ID,
  USER_HISTORY_ROW_TEST_ID,
  VULNERABILITY_HISTORY_ROW_TEST_ID,
} from './test_ids';
import { HostPanelKeyV2, UserPanelKeyV2 } from '../../entity_details/shared/constants';
import { VulnerabilityFindingsPanelKeyV2 } from '../../csp_details/vulnerabilities_flyout/constants';
import { MisconfigurationFindingsPanelKeyV2 } from '../../csp_details/findings_flyout/constants';

const MAX_WIDTH = 300; // px

export interface FlyoutHistoryRowProps {
  /**
   * Flyout item to display
   */
  item: FlyoutPanelHistory;
  /**
   * Index of the flyout in the list
   */
  index: number;
}

/**
 * Row item for a flyout history row
 */
export const FlyoutHistoryRow: FC<FlyoutHistoryRowProps> = memo(({ item, index }) => {
  switch (item.panel.id) {
    case DocumentDetailsRightPanelKeyV2:
    case EasePanelKeyV2:
      return <DocumentDetailsHistoryRow item={item} index={index} />;
    case RulePanelKeyV2:
      return <RuleHistoryRow item={item} index={index} />;
    case HostPanelKeyV2:
      return (
        <GenericHistoryRow
          item={item}
          index={index}
          title={String(item.panel.params?.hostName)}
          icon={'storage'}
          name={'Host'}
          dataTestSubj={HOST_HISTORY_ROW_TEST_ID}
        />
      );
    case UserPanelKeyV2:
      return (
        <GenericHistoryRow
          item={item}
          index={index}
          title={String(item.panel.params?.userName)}
          icon={'user'}
          name={'User'}
          dataTestSubj={USER_HISTORY_ROW_TEST_ID}
        />
      );
    case NetworkPanelKeyV2:
      return (
        <GenericHistoryRow
          item={item}
          index={index}
          title={String(item?.panel?.params?.ip)}
          icon={'globe'}
          name={'Network'}
          dataTestSubj={NETWORK_HISTORY_ROW_TEST_ID}
        />
      );
    case MisconfigurationFindingsPanelKeyV2:
    case VulnerabilityFindingsPanelKeyV2:
      const TEST_ID =
        item.panel.id === MisconfigurationFindingsPanelKeyV2
          ? MISCONFIGURATION_HISTORY_ROW_TEST_ID
          : VULNERABILITY_HISTORY_ROW_TEST_ID;

      return (
        <GenericHistoryRow
          item={item}
          index={index}
          title={String(item?.panel?.params?.resourceId)}
          icon={'document'}
          name={'Resource Id'}
          dataTestSubj={TEST_ID}
        />
      );
    default:
      return null;
  }
});

/**
 * Row item for a document details
 */
export const DocumentDetailsHistoryRow: FC<FlyoutHistoryRowProps> = memo(({ item, index }) => {
  const { dataFormattedForFieldBrowser, getFieldsData, loading } = useEventDetails({
    eventId: String(item?.panel?.params?.id),
    indexName: String(item?.panel?.params?.indexName),
  });
  const { ruleName, isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const eventKind = useMemo(() => getField(getFieldsData('event.kind')), [getFieldsData]);
  const eventCategory = useMemo(() => getField(getFieldsData('event.category')), [getFieldsData]);

  const title = useMemo(
    () =>
      isAlert
        ? getAlertTitle({ ruleName })
        : getEventTitle({ eventKind, eventCategory, getFieldsData }),
    [isAlert, ruleName, eventKind, eventCategory, getFieldsData]
  );

  return (
    <GenericHistoryRow
      item={item}
      index={index}
      title={title}
      icon={isAlert ? 'warning' : 'analyzeEvent'}
      name={isAlert ? 'Alert' : 'Event'}
      isLoading={loading}
      dataTestSubj={DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID}
    />
  );
});

interface RowTitleProps {
  /**
   * alert, event, host, user, network, rule...
   */
  type: string;
  /**
   * Actual value of the rule, host, user...
   */
  value: string;
}

/**
 * Populates the generic row main text
 */
const RowTitle: FC<RowTitleProps> = memo(({ type, value }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <span
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >{`${type}:`}</span>
      &nbsp;
      <span
        css={css`
          max-width: ${MAX_WIDTH}px;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        `}
      >
        {value}
      </span>
    </>
  );
});

/**
 * Row item for a rule details flyout
 */
export const RuleHistoryRow: FC<FlyoutHistoryRowProps> = memo(({ item, index }) => {
  const ruleId = String(item?.panel?.params?.ruleId);
  const { rule, loading } = useRuleDetails({ ruleId });

  return (
    <GenericHistoryRow
      item={item}
      index={index}
      title={rule?.name ?? ''}
      icon={'indexSettings'}
      name={'Rule'}
      isLoading={loading}
      dataTestSubj={RULE_HISTORY_ROW_TEST_ID}
    />
  );
});

interface GenericHistoryRowProps extends FlyoutHistoryRowProps {
  /**
   * Index to put in the html key attribute
   */
  index: number;
  /**
   * Icon to display
   */
  icon: EuiIconProps['type'];
  /**
   * Title to display
   */
  title: string;
  /**
   * Name to display
   */
  name: string;
  /**
   * Whether the row is loading
   */
  isLoading?: boolean;
  /**
   * Data test subject
   */
  dataTestSubj?: string;
}

/**
 * Row item for a generic history row where the title is accessible in flyout params
 */
export const GenericHistoryRow: FC<GenericHistoryRowProps> = memo(
  ({ item, index, title, icon, name, isLoading, dataTestSubj }) => {
    const { euiTheme } = useEuiTheme();
    const { openFlyout } = useFlyoutApi();
    const onClick = useCallback(() => openFlyout({ main: item.panel }), [item.panel, openFlyout]);

    if (isLoading) {
      return (
        <EuiContextMenuItem key={index} data-test-subj={HISTORY_ROW_LOADING_TEST_ID}>
          <EuiSkeletonText lines={1} isLoading size="s" />
        </EuiContextMenuItem>
      );
    }

    return (
      <EuiContextMenuItem
        key={index}
        onClick={onClick}
        icon={icon}
        css={css`
          align-items: flex-start;
          padding: ${euiTheme.size.s} ${euiTheme.size.m};
        `}
        data-test-subj={`${index}-${dataTestSubj ?? GENERIC_HISTORY_ROW_TEST_ID}`}
      >
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem
            css={css`
              flex-direction: row;
            `}
          >
            <RowTitle type={name} value={title} />
          </EuiFlexItem>
          <EuiFlexItem
            css={css`
              color: ${euiTheme.colors.textSubdued};
            `}
          >
            <FormattedRelativePreferenceDate value={item.lastOpen} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiContextMenuItem>
    );
  }
);

FlyoutHistoryRow.displayName = 'FlyoutHistoryRow';
DocumentDetailsHistoryRow.displayName = 'DocumentDetailsHistoryRow';
RuleHistoryRow.displayName = 'RuleHistoryRow';
RowTitle.displayName = 'RowTitle';
GenericHistoryRow.displayName = 'GenericHistoryRow';
