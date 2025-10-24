/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';

const ALERT_BANNER = i18n.translate(
  'xpack.securitySolution.flyout.header.alertPreview.bannerLabel',
  {
    defaultMessage: 'Preview alert details',
  }
);
const EVENT_BANNER = i18n.translate(
  'xpack.securitySolution.flyout.header.eventPreview.bannerLabel',
  {
    defaultMessage: 'Preview event details',
  }
);

export interface DocumentDetailsPreviewBannerProps {
  /**
   *
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
}

export const DocumentDetailsPreviewBanner = memo(
  ({ dataFormattedForFieldBrowser }: DocumentDetailsPreviewBannerProps) => {
    const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

    return (
      <EuiFlexGroup
        justifyContent="center"
        css={css`
          padding: 4px;
          background-color: #fdf3d8;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiText color="#825803" size="xs">
            {isAlert ? ALERT_BANNER : EVENT_BANNER}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

DocumentDetailsPreviewBanner.displayName = 'DocumentDetailsPreviewBanner';
