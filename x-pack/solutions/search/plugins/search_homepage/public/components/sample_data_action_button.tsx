/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSampleDataStatus } from '../hooks/use_sample_data_status';
import { useKibana } from '../hooks/use_kibana';
import { useNavigateToDiscover } from '../hooks/use_navigate_to_discover';

interface SampleDataActionButtonProps {
  isLoading: boolean;
  onIngestSampleData: () => void;
}

export const SampleDataActionButton: React.FC<SampleDataActionButtonProps> = ({
  isLoading,
  onIngestSampleData,
}) => {
  const { share, uiSettings } = useKibana().services;
  const { isInstalled, indexName, isLoading: isStatusLoading } = useSampleDataStatus();
  const [isShowViewDataOptions, setShowViewDataOptions] = useState(false);

  const onViewButtonClick = useCallback(() => {
    setShowViewDataOptions(true);
  }, []);

  const onClosePopover = useCallback(() => {
    setShowViewDataOptions(false);
  }, []);

  const navigateToPlayground = useCallback(async () => {
    const playgroundLocator = share.url.locators.get('PLAYGROUND_LOCATOR_ID');
    const isSearchAvailable = uiSettings.get<boolean>('searchPlayground:searchModeEnabled', false);

    if (playgroundLocator && indexName) {
      await playgroundLocator.navigate({
        'default-index': indexName,
        search: isSearchAvailable,
      });
    }
  }, [share, uiSettings, indexName]);

  const navigateToDiscover = useNavigateToDiscover(indexName || '');

  const navigateToIndexDetails = useCallback(async () => {
    const indexDetailsLocator = share.url.locators.get('SEARCH_INDEX_DETAILS_LOCATOR_ID');
    if (indexDetailsLocator && indexName) {
      await indexDetailsLocator.navigate({ indexName });
    }
  }, [share, indexName]);

  if (isStatusLoading) {
    return null;
  }

  if (isInstalled && indexName) {
    const button = (
      <EuiButtonEmpty
        data-test-subj="viewDataBtn"
        size="s"
        iconType="arrowDown"
        iconSide="right"
        onClick={onViewButtonClick}
      >
        <FormattedMessage id="xpack.searchHomepage.sampleData.view" defaultMessage="View Data" />
      </EuiButtonEmpty>
    );

    return (
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={button}
          isOpen={isShowViewDataOptions}
          closePopover={onClosePopover}
          anchorPosition="downLeft"
          panelPaddingSize="s"
        >
          <EuiContextMenuPanel
            css={{ minWidth: 250 }}
            items={[
              <EuiContextMenuItem key="discover" onClick={navigateToDiscover} icon="discoverApp">
                <FormattedMessage
                  id="xpack.searchHomepage.sampleData.linkToDiscover"
                  defaultMessage="Discover"
                />
              </EuiContextMenuItem>,
              <EuiContextMenuItem key="playground" onClick={navigateToPlayground} icon="comment">
                <FormattedMessage
                  id="xpack.searchHomepage.sampleData.linkToPlayground"
                  defaultMessage="Playground"
                />
              </EuiContextMenuItem>,
              <EuiContextMenuItem key="index" onClick={navigateToIndexDetails} icon="index">
                <FormattedMessage
                  id="xpack.searchHomepage.sampleData.linkToIndex"
                  defaultMessage="View index"
                />
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    );
  }

  return (
    <EuiButtonEmpty
      color="primary"
      iconSide="left"
      iconType="download"
      size="s"
      data-test-subj="installSampleBtn"
      isLoading={isLoading}
      onClick={onIngestSampleData}
    >
      <FormattedMessage
        id="xpack.searchHomepage.sampleData.btn"
        defaultMessage="Install a sample dataset"
      />
    </EuiButtonEmpty>
  );
};
