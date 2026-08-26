/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { getIndicatorFieldAndValue } from '../../../threat_intelligence/modules/indicators/utils/field_value';
import type { Indicator } from '../../../../common/threat_intelligence/types/indicator';
import { RawIndicatorFieldId } from '../../../../common/threat_intelligence/types/indicator';
import type { RightPanelTabType, RightPanelPaths } from './tabs';
import { flyoutHeaderBlockStyles } from '../../shared/components/flyout_header_block';
import { FlyoutTitle } from '../../shared/components/flyout_title';
import { Timestamp } from '../../shared/components/timestamp';
import type { CellActionRenderer } from '../../shared/components/cell_actions';
import { HeaderBlock } from './components/header_block';
import { unwrapValue } from '../../../threat_intelligence/modules/indicators/utils/unwrap_value';
import { IOC_DETAILS_TITLE_TEST_ID, IOC_DETAILS_SUBTITLE_TEST_ID } from './test_ids';

export const INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS = 'tiFlyoutOverviewHighLevelBlocks';
export const INDICATORS_FLYOUT_OVERVIEW_TITLE = 'tiFlyoutOverviewTitle';

export interface HeaderProps {
  /**
   * The indicator document
   */
  indicator: Indicator;
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId?: RightPanelPaths;
  /**
   * Callback to set the selected tab id in the parent component
   */
  setSelectedTabId?: (selected: RightPanelPaths) => void;
  /**
   * Tabs to display in the header
   */
  tabs?: RightPanelTabType[];
  /**
   * Renderer for cell actions
   */
  renderCellActions: CellActionRenderer;
}

const highLevelFields = [
  RawIndicatorFieldId.Feed,
  RawIndicatorFieldId.Type,
  RawIndicatorFieldId.MarkingTLP,
  RawIndicatorFieldId.Confidence,
] as const;

/**
 * Header of the indicator details flyout
 */
export const Header: FC<HeaderProps> = memo(
  ({ indicator, selectedTabId, setSelectedTabId, tabs, renderCellActions }) => {
    const onSelectedTabChanged = useCallback(
      (id: RightPanelPaths) => (setSelectedTabId ? setSelectedTabId(id) : () => {}),
      [setSelectedTabId]
    );

    const renderTabs = useMemo(
      () =>
        tabs?.map((tab, index) => (
          <EuiTab
            onClick={() => onSelectedTabChanged(tab.id)}
            isSelected={tab.id === selectedTabId}
            key={index}
            data-test-subj={tab['data-test-subj']}
          >
            {tab.name}
          </EuiTab>
        )),
      [onSelectedTabChanged, selectedTabId, tabs]
    );

    const hit = useMemo(
      () =>
        buildDataTableRecord({
          _id: String(indicator._id ?? ''),
          fields: indicator.fields,
        } as unknown as EsHitRecord),
      [indicator]
    );

    const title: string | null = getIndicatorFieldAndValue(
      indicator,
      RawIndicatorFieldId.Name
    ).value;

    const indicatorDescription = useMemo(() => {
      const unwrappedDescription = unwrapValue(indicator, RawIndicatorFieldId.Description);

      return unwrappedDescription ? <EuiText>{unwrappedDescription}</EuiText> : null;
    }, [indicator]);

    const highLevelBlocks = useMemo(
      () => (
        <EuiFlexGroup
          direction="row"
          gutterSize="s"
          responsive={false}
          wrap
          data-test-subj={INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}
        >
          <EuiFlexItem css={flyoutHeaderBlockStyles}>
            <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
              <EuiFlexItem>
                <HeaderBlock
                  indicator={indicator}
                  field={highLevelFields[0]}
                  renderCellActions={renderCellActions}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <HeaderBlock
                  indicator={indicator}
                  field={highLevelFields[1]}
                  renderCellActions={renderCellActions}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem css={flyoutHeaderBlockStyles}>
            <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
              <EuiFlexItem>
                <HeaderBlock
                  indicator={indicator}
                  field={highLevelFields[2]}
                  renderCellActions={renderCellActions}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <HeaderBlock
                  indicator={indicator}
                  field={highLevelFields[3]}
                  renderCellActions={renderCellActions}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      [indicator, renderCellActions]
    );

    return (
      <>
        <FlyoutTitle
          title={i18n.translate('xpack.securitySolution.flyout.iocDetails.panelTitle', {
            defaultMessage: 'Indicator details',
          })}
          data-test-subj={IOC_DETAILS_TITLE_TEST_ID}
        />
        <EuiText size={'xs'}>
          <EuiFlexGroup
            alignItems={'center'}
            gutterSize={'xs'}
            data-test-subj={IOC_DETAILS_SUBTITLE_TEST_ID}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.iocDetails.panelSubTitle"
              defaultMessage="First seen:"
            />
            <Timestamp hit={hit} field={RawIndicatorFieldId.FirstSeen} size={'xs'} />
          </EuiFlexGroup>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiTitle size="xs">
          <h3 data-test-subj={INDICATORS_FLYOUT_OVERVIEW_TITLE}>{title}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        {indicatorDescription && (
          <>
            <EuiText>{indicatorDescription}</EuiText>
            <EuiSpacer size="xs" />
          </>
        )}
        {highLevelBlocks}

        {renderTabs && (
          <>
            <EuiSpacer size="s" />
            <EuiTabs size="l" expand>
              {renderTabs}
            </EuiTabs>
          </>
        )}
      </>
    );
  }
);

Header.displayName = 'Header';
