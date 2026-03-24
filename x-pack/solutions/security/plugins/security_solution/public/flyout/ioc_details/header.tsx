/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutHeader } from '@elastic/eui';
import { EuiSpacer, EuiTab, EuiText, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIOCDetailsContext } from './context';
import { unwrapValue } from '../../threat_intelligence/modules/indicators/utils/unwrap_value';
import { RawIndicatorFieldId } from '../../../common/threat_intelligence/types/indicator';
import { DateFormatter } from '../../threat_intelligence/components/date_formatter';
import { FlyoutHeaderTabs } from '../shared/components/flyout_header_tabs';
import { FlyoutHeader } from '../shared/components/flyout_header';
import type { RightPanelTabType } from './tabs';
import type { RightPanelPaths } from '.';

export const INDICATORS_FLYOUT_TITLE_TEST_ID = 'tiIndicatorFlyoutTitle';
export const INDICATORS_FLYOUT_SUBTITLE_TEST_ID = 'tiIndicatorFlyoutSubtitle';

export interface PanelHeaderProps extends React.ComponentProps<typeof EuiFlyoutHeader> {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: RightPanelPaths;
  /**
   * Callback to set the selected tab id in the parent component
   * @param selected
   */
  setSelectedTabId: (selected: RightPanelPaths) => void;
  /**
   * Tabs to display in the header
   */
  tabs: RightPanelTabType[];
}

/**
 * Header of the indicator details panel flyout
 */
export const PanelHeader: FC<PanelHeaderProps> = memo(
  ({ selectedTabId, setSelectedTabId, tabs, ...flyoutHeaderProps }) => {
    const { indicator } = useIOCDetailsContext();

    const onSelectedTabChanged = useCallback(
      (id: RightPanelPaths) => setSelectedTabId(id),
      [setSelectedTabId]
    );

    const renderTabs = useMemo(
      () =>
        tabs.map((tab, index) => (
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

    const firstSeen: string = unwrapValue(indicator, RawIndicatorFieldId.FirstSeen) as string;

    return (
      <FlyoutHeader {...flyoutHeaderProps}>
        <EuiTitle>
          <h2 data-test-subj={INDICATORS_FLYOUT_TITLE_TEST_ID}>
            <FormattedMessage
              id="xpack.securitySolution.threatIntelligence.indicator.flyout.panelTitleWithOverviewTab"
              defaultMessage="Indicator details"
            />
          </h2>
        </EuiTitle>
        <EuiText size={'xs'}>
          <p data-test-subj={INDICATORS_FLYOUT_SUBTITLE_TEST_ID}>
            <FormattedMessage
              id="xpack.securitySolution.threatIntelligence.indicator.flyout.panelSubTitle"
              defaultMessage="First seen: "
            />
            <DateFormatter date={firstSeen} />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <FlyoutHeaderTabs>{renderTabs}</FlyoutHeaderTabs>
      </FlyoutHeader>
    );
  }
);

PanelHeader.displayName = 'PanelHeader';
