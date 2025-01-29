/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiSuperDatePicker,
  EuiSuperDatePickerCommonRange,
} from '@elastic/eui';
import { OnTimeChangeProps } from '@elastic/eui/src/components/date_picker/super_date_picker/super_date_picker';

import { OnRefreshChangeProps } from '@elastic/eui/src/components/date_picker/types';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';

import { generateEncodedPath } from '../../../../shared/encode_path_params';

import { KibanaLogic } from '../../../../shared/kibana';
import { COLLECTION_INTEGRATE_PATH } from '../../../routes';
import { DeleteAnalyticsCollectionLogic } from '../delete_analytics_collection_logic';
import { FetchAnalyticsCollectionLogic } from '../fetch_analytics_collection_logic';
import { useDiscoverLink } from '../use_discover_link';

import { AnalyticsCollectionToolbarLogic } from './analytics_collection_toolbar_logic';

const defaultQuickRanges: EuiSuperDatePickerCommonRange[] = [
  {
    end: 'now',
    label: i18n.translate('xpack.enterpriseSearch.analytics..units.quickRange.last7Days', {
      defaultMessage: 'Last 7 days',
    }),
    start: 'now-7d',
  },
  {
    end: 'now',
    label: i18n.translate('xpack.enterpriseSearch.analytics..units.quickRange.last2Weeks', {
      defaultMessage: 'Last 2 weeks',
    }),
    start: 'now-14d',
  },
  {
    end: 'now',
    label: i18n.translate('xpack.enterpriseSearch.analytics..units.quickRange.last30Days', {
      defaultMessage: 'Last 30 days',
    }),
    start: 'now-30d',
  },
  {
    end: 'now',
    label: i18n.translate('xpack.enterpriseSearch.analytics..units.quickRange.last90Days', {
      defaultMessage: 'Last 90 days',
    }),
    start: 'now-90d',
  },
  {
    end: 'now',
    label: i18n.translate('xpack.enterpriseSearch.analytics..units.quickRange.last1Year', {
      defaultMessage: 'Last 1 year',
    }),
    start: 'now-1y',
  },
];

export const AnalyticsCollectionToolbar: React.FC = () => {
  const discoverLink = useDiscoverLink();
  const [isPopoverOpen, setPopover] = useState(false);
  const { application, navigateToUrl } = useValues(KibanaLogic);
  const { analyticsCollection } = useValues(FetchAnalyticsCollectionLogic);
  const { setTimeRange, setRefreshInterval, onTimeRefresh } = useActions(
    AnalyticsCollectionToolbarLogic
  );
  const { refreshInterval, timeRange } = useValues(AnalyticsCollectionToolbarLogic);
  const { deleteAnalyticsCollection } = useActions(DeleteAnalyticsCollectionLogic);
  const { isLoading } = useValues(DeleteAnalyticsCollectionLogic);
  const manageDatastreamUrl = application.getUrlForApp('management', {
    path: '/data/index_management/data_streams/' + analyticsCollection.events_datastream,
  });
  const handleTimeChange = ({ start: from, end: to }: OnTimeChangeProps) => {
    setTimeRange({ from, to });
  };
  const closePopover = () => {
    setPopover(false);
  };
  const togglePopover = () => {
    setPopover(!isPopoverOpen);
  };
  const onRefreshChange = ({ isPaused: pause, refreshInterval: value }: OnRefreshChangeProps) => {
    setRefreshInterval({ pause, value });
  };

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiSuperDatePicker
          start={timeRange.from}
          end={timeRange.to}
          refreshInterval={refreshInterval.value}
          isPaused={refreshInterval.pause}
          onTimeChange={handleTimeChange}
          onRefresh={onTimeRefresh}
          onRefreshChange={onRefreshChange}
          showUpdateButton="iconOnly"
          updateButtonProps={{ fill: false }}
          width="full"
          commonlyUsedRanges={defaultQuickRanges}
        />
      </EuiFlexItem>

      <RedirectAppLinks coreStart={{ application }}>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiButton iconType="arrowDown" iconSide="right" onClick={togglePopover}>
                <FormattedMessage
                  id="xpack.enterpriseSearch.analytics.collectionsView.manageButton"
                  defaultMessage="Manage"
                />
              </EuiButton>
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            anchorPosition="downRight"
            panelPaddingSize="none"
          >
            <EuiContextMenuPanel>
              <EuiContextMenuItem
                icon="link"
                size="s"
                data-telemetry-id={'entSearch-analytics-overview-toolbar-integrate-tracker-link'}
                onClick={() =>
                  navigateToUrl(
                    generateEncodedPath(COLLECTION_INTEGRATE_PATH, {
                      name: analyticsCollection.name,
                    })
                  )
                }
              >
                <FormattedMessage
                  id="xpack.enterpriseSearch.analytics.collectionsView.integrateTracker"
                  defaultMessage="Integrate JS tracker"
                />
              </EuiContextMenuItem>

              <EuiContextMenuItem
                icon="database"
                size="s"
                href={manageDatastreamUrl}
                data-telemetry-id={'entSearch-analytics-overview-toolbar-manage-datastream-link'}
              >
                <FormattedMessage
                  id="xpack.enterpriseSearch.analytics.collectionsView.manageEventsDatastream"
                  defaultMessage="Manage events datastream"
                />
              </EuiContextMenuItem>

              {discoverLink && (
                <EuiContextMenuItem
                  icon="visArea"
                  href={discoverLink}
                  size="s"
                  data-telemetry-id={'entSearch-analytics-overview-toolbar-manage-discover-link'}
                >
                  <FormattedMessage
                    id="xpack.enterpriseSearch.analytics.collectionsView.openInDiscover"
                    defaultMessage="Create dashboards in Discover"
                  />
                </EuiContextMenuItem>
              )}

              <EuiPopoverFooter paddingSize="m">
                <EuiButton
                  type="submit"
                  color="danger"
                  fullWidth
                  isLoading={!isLoading}
                  disabled={!isLoading}
                  data-telemetry-id={
                    'entSearch-analytics-overview-toolbar-delete-collection-button'
                  }
                  size="s"
                  onClick={() => {
                    deleteAnalyticsCollection(analyticsCollection.name);
                  }}
                >
                  <FormattedMessage
                    id="xpack.enterpriseSearch.analytics.collections.collectionsView.delete.buttonTitle"
                    defaultMessage="Delete collection"
                  />
                </EuiButton>
              </EuiPopoverFooter>
            </EuiContextMenuPanel>
          </EuiPopover>
        </EuiFlexItem>
      </RedirectAppLinks>
    </EuiFlexGroup>
  );
};
