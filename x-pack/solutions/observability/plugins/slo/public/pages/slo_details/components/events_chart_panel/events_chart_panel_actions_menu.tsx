/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiLink,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  type SLOWithSummaryResponse,
} from '@kbn/slo-schema';
import type { TimeRange } from '@kbn/es-query';
import React, { useState } from 'react';
import { useFetchApmIndices } from '../../../../hooks/use_fetch_apm_indices';
import { useKibana } from '../../../../hooks/use_kibana';
import { getDiscoverLink } from '../../utils/discover_links/get_discover_link';
import { getApmTracesEsqlLink } from '../../utils/discover_links/get_apm_traces_esql_link';

interface EventsChartPanelActionsMenuProps {
  slo: SLOWithSummaryResponse;
  timeRange: TimeRange;
}

export function EventsChartPanelActionsMenu({ slo, timeRange }: EventsChartPanelActionsMenuProps) {
  const { discover, uiSettings } = useKibana().services;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const {
    data: { transaction: transactionIndex },
  } = useFetchApmIndices();

  const showTracesLink =
    apmTransactionDurationIndicatorSchema.is(slo.indicator) ||
    apmTransactionErrorRateIndicatorSchema.is(slo.indicator);
  const esqlLink = showTracesLink
    ? getApmTracesEsqlLink({ slo, timeRange, discover, transactionIndex })
    : undefined;

  if (esqlLink) {
    return (
      <EuiPopover
        aria-label={i18n.translate('xpack.slo.sloDetails.viewMenuAriaLabel', {
          defaultMessage: 'View options',
        })}
        button={
          <EuiButtonEmpty
            iconSide="right"
            iconType="arrowDown"
            onClick={() => setIsPopoverOpen((open) => !open)}
            data-test-subj="sloDetailViewButton"
          >
            <FormattedMessage id="xpack.slo.sloDetails.viewButton" defaultMessage="View" />
          </EuiButtonEmpty>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downRight"
      >
        <EuiContextMenuPanel
          items={[
            <EuiContextMenuItem
              key="events"
              icon="list"
              href={getDiscoverLink({ slo, timeRange, discover, uiSettings })}
              data-test-subj="sloDetailDiscoverLink"
              onClick={() => setIsPopoverOpen(false)}
            >
              <FormattedMessage id="xpack.slo.sloDetails.viewEventsLink" defaultMessage="Events" />
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key="traces"
              icon="discoverApp"
              href={esqlLink}
              data-test-subj="sloDetailOpenEventsLink"
              onClick={() => setIsPopoverOpen(false)}
            >
              <FormattedMessage
                id="xpack.slo.sloDetails.openTracesLink"
                defaultMessage="Traces in Discover"
              />
            </EuiContextMenuItem>,
          ]}
        />
      </EuiPopover>
    );
  }

  return (
    <EuiLink
      color="text"
      href={getDiscoverLink({ slo, timeRange, discover, uiSettings })}
      data-test-subj="sloDetailDiscoverLink"
    >
      <EuiIcon type="sortRight" aria-hidden={true} css={{ marginRight: '4px' }} />
      <FormattedMessage id="xpack.slo.sloDetails.viewEventsLink" defaultMessage="View events" />
    </EuiLink>
  );
}
