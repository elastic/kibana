/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTab, EuiTabs, EuiText, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIOCDetailsContext } from './context';
import { unwrapValue } from '../../threat_intelligence/modules/indicators/utils/unwrap_value';
import { RawIndicatorFieldId } from '../../../common/threat_intelligence/types/indicator';
import { DateFormatter } from '../../threat_intelligence/components/date_formatter';
import type { RightPanelTabType, RightPanelPaths } from './tabs';
import { IOC_DETAILS_TITLE_TEST_ID, IOC_DETAILS_SUBTITLE_TEST_ID } from './test_ids';

export interface HeaderProps {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: RightPanelPaths;
  /**
   * Callback to set the selected tab id in the parent component
   */
  setSelectedTabId: (selected: RightPanelPaths) => void;
  /**
   * Tabs to display in the header
   */
  tabs: RightPanelTabType[];
}

/**
 * Header of the indicator details flyout
 */
export const Header: FC<HeaderProps> = memo(({ selectedTabId, setSelectedTabId, tabs }) => {
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
    <>
      <EuiTitle>
        <h2 data-test-subj={IOC_DETAILS_TITLE_TEST_ID}>
          <FormattedMessage
            id="xpack.securitySolution.flyout.iocDetails.panelTitle"
            defaultMessage="Indicator details"
          />
        </h2>
      </EuiTitle>
      <EuiText size={'xs'}>
        <p data-test-subj={IOC_DETAILS_SUBTITLE_TEST_ID}>
          <FormattedMessage
            id="xpack.securitySolution.flyout.iocDetails.panelSubTitle"
            defaultMessage="First seen: "
          />
          <DateFormatter date={firstSeen} />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiTabs size="l" expand>
        {renderTabs}
      </EuiTabs>
    </>
  );
});

Header.displayName = 'Header';
