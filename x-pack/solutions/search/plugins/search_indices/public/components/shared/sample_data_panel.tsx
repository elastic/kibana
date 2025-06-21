/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSampleDataStatus } from '../../hooks/use_sample_data_status';
import { useKibana } from '../../hooks/use_kibana';
import { navigateToIndexDetails } from '../utils';
import { useNavigateToDiscover } from '../../hooks/use_navigate_to_discover';

interface SampleDataPanelProps {
  isLoading: boolean;
  onIngestSampleData: () => void;
}

export const SampleDataPanel = ({ isLoading, onIngestSampleData }: SampleDataPanelProps) => {
  const { application, http, share, uiSettings } = useKibana().services;
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

  const renderActionButton = () => {
    if (isStatusLoading) {
      return;
    }

    if (isInstalled) {
      const button = (
        <EuiButtonEmpty
          data-test-subj="viewDataBtn"
          size="s"
          iconType="arrowDown"
          iconSide="right"
          onClick={onViewButtonClick}
        >
          <FormattedMessage
            id="xpack.searchIndices.shared.createIndex.ingestSampleData.view"
            defaultMessage="View Data"
          />
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
                    id="xpack.searchIndices.shared.createIndex.ingestSampleData.linkToDiscover"
                    defaultMessage="Discover"
                  />
                </EuiContextMenuItem>,
                <EuiContextMenuItem key="playground" onClick={navigateToPlayground} icon="comment">
                  <FormattedMessage
                    id="xpack.searchIndices.shared.createIndex.ingestSampleData.linkToPlayground"
                    defaultMessage="Playground"
                  />
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="index"
                  onClick={() => {
                    if (indexName) {
                      navigateToIndexDetails(application, http, indexName);
                    }
                  }}
                  icon="index"
                >
                  <FormattedMessage
                    id="xpack.searchIndices.shared.createIndex.ingestSampleData.linkToIndex"
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
        data-test-subj="instalSampleBtn"
        isLoading={isLoading}
        onClick={onIngestSampleData}
      >
        <FormattedMessage
          id="xpack.searchIndices.shared.createIndex.ingestSampleData.btn"
          defaultMessage="Install a sample dataset"
        />
      </EuiButtonEmpty>
    );
  };

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="s">
          <p>
            <FormattedMessage
              id="xpack.searchIndices.shared.createIndex.sampleData.text"
              defaultMessage="Want to try sample data?"
            />
          </p>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>{renderActionButton()}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
