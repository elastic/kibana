/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import {
  INDEX_MANAGEMENT_LOCATOR_ID,
  type IndexManagementLocatorParams,
} from '@kbn/index-management-shared-types';
import { useKibana } from '../hooks/use_kibana';
import { formatBytes, formatNumber } from '../utils/format';
import type { NewIndexDetails } from '../../common/types';
import {
  newIndexName,
  newIndexShrinkable,
  newIndexStat,
  newIndexValue,
} from './new_index_panel_styles';

interface NewIndexPanelProps {
  index: NewIndexDetails;
  onDismiss: () => void;
}

const dismissLabel = i18n.translate('xpack.serverlessVectordb.home.newIndex.dismiss', {
  defaultMessage: 'Dismiss',
});

const openIndexLabel = i18n.translate('xpack.serverlessVectordb.home.newIndex.open', {
  defaultMessage: 'Open index',
});

export const NewIndexPanel = ({ index, onDismiss }: NewIndexPanelProps) => {
  const {
    services: { share },
  } = useKibana();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const showStats = useIsWithinMinBreakpoint('l');
  const showActions = useIsWithinMinBreakpoint('m');

  const { indexName, documentsCount, sizeInBytes } = index;

  const actionsMenuLabel = i18n.translate('xpack.serverlessVectordb.home.newIndex.actionsMenu', {
    defaultMessage: '{indexName} actions',
    values: { indexName },
  });

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const handleOpenIndex = useCallback(() => {
    share.url.locators
      .get<IndexManagementLocatorParams>(INDEX_MANAGEMENT_LOCATOR_ID)
      ?.navigate({ page: 'index_details', indexName });
  }, [share, indexName]);

  const handleViewInDiscover = useCallback(() => {
    share.url.locators
      .get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR)
      ?.navigate({ dataViewSpec: { title: indexName } });
  }, [share, indexName]);

  const menuItems = [
    ...(showActions
      ? []
      : [
          <EuiContextMenuItem
            key="openIndex"
            icon="indexOpen"
            onClick={() => {
              closePopover();
              handleOpenIndex();
            }}
            data-test-subj="homePageDataCardNewIndexOpenMenuItem"
            data-telemetry-id="serverlessVectordb-home-newIndex-open"
          >
            {openIndexLabel}
          </EuiContextMenuItem>,
        ]),
    <EuiContextMenuItem
      key="viewInDiscover"
      icon="discoverApp"
      onClick={() => {
        closePopover();
        handleViewInDiscover();
      }}
      data-test-subj="homePageDataCardNewIndexDiscoverMenuItem"
      data-telemetry-id="serverlessVectordb-home-newIndex-discover"
    >
      {i18n.translate('xpack.serverlessVectordb.home.newIndex.viewInDiscover', {
        defaultMessage: 'View in Discover',
      })}
    </EuiContextMenuItem>,
    ...(showActions
      ? []
      : [
          <EuiContextMenuItem
            key="dismiss"
            icon="cross"
            onClick={() => {
              closePopover();
              onDismiss();
            }}
            data-test-subj="homePageDataCardNewIndexDismissMenuItem"
            data-telemetry-id="serverlessVectordb-home-newIndex-dismiss"
          >
            {dismissLabel}
          </EuiContextMenuItem>,
        ]),
  ];

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="m"
      responsive={false}
      wrap
      data-test-subj="homePageDataCardNewIndex"
    >
      <EuiFlexItem grow css={newIndexShrinkable}>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary" fill>
              {i18n.translate('xpack.serverlessVectordb.home.newIndex.badge', {
                defaultMessage: 'New index',
              })}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={newIndexShrinkable}>
            <EuiText
              size="s"
              title={indexName}
              css={[newIndexValue, newIndexName]}
              data-test-subj="homePageDataCardNewIndexName"
            >
              {indexName}
            </EuiText>
          </EuiFlexItem>
          {showStats && (
            <EuiFlexItem grow={false}>
              <EuiText
                size="s"
                color="subdued"
                css={newIndexStat}
                data-test-subj="homePageDataCardNewIndexDocuments"
              >
                <FormattedMessage
                  id="xpack.serverlessVectordb.home.newIndex.documents"
                  defaultMessage="Documents: {count}"
                  values={{
                    count: <strong css={newIndexValue}>{formatNumber(documentsCount)}</strong>,
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          )}
          {showStats && (
            <EuiFlexItem grow={false}>
              <EuiText
                size="s"
                color="subdued"
                css={newIndexStat}
                data-test-subj="homePageDataCardNewIndexSize"
              >
                <FormattedMessage
                  id="xpack.serverlessVectordb.home.newIndex.size"
                  defaultMessage="Size: {size}"
                  values={{
                    size: <strong css={newIndexValue}>{formatBytes(sizeInBytes)}</strong>,
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          {showActions && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                color="text"
                onClick={onDismiss}
                data-test-subj="homePageDataCardNewIndexDismissBtn"
                data-telemetry-id="serverlessVectordb-home-newIndex-dismiss"
              >
                {dismissLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          {showActions && (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color="text"
                onClick={handleOpenIndex}
                data-test-subj="homePageDataCardNewIndexOpenBtn"
                data-telemetry-id="serverlessVectordb-home-newIndex-open"
              >
                {openIndexLabel}
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiPopover
              aria-label={actionsMenuLabel}
              button={
                <EuiToolTip content={actionsMenuLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="ellipsis"
                    aria-label={actionsMenuLabel}
                    aria-haspopup="menu"
                    onClick={() => setIsPopoverOpen((open) => !open)}
                    size="s"
                    color="text"
                    data-test-subj="homePageDataCardNewIndexActionsButton"
                    data-telemetry-id="serverlessVectordb-home-newIndex-actionsMenu"
                  />
                </EuiToolTip>
              }
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              panelPaddingSize="none"
              anchorPosition="downRight"
            >
              <EuiContextMenuPanel items={menuItems} />
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
