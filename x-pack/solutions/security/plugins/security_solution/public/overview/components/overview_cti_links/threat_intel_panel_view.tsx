/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '../../../../common/constants';
import { SecuritySolutionLinkButton } from '../../../common/components/links';

import * as i18n from './translations';
import type { LinkPanelListItem } from '../link_panel';
import { LinkPanel } from '../link_panel';
import type { LinkPanelViewProps } from '../link_panel/types';
import { shortenCountIntoString } from '../../../common/utils/shorten_count_into_string';
import { Link } from '../link_panel/link';
import { ID as CTIEventCountQueryId } from '../../containers/overview_cti_links/use_ti_data_sources';

const columns: Array<EuiTableFieldDataColumnType<LinkPanelListItem>> = [
  { name: 'Name', field: 'title', sortable: true, truncateText: true, width: '100%' },
  {
    name: 'Indicator',
    field: 'count',
    render: shortenCountIntoString,
    sortable: true,
    truncateText: true,
    width: '70px',
    align: 'right',
  },
  {
    name: '',
    field: 'path',
    truncateText: true,
    width: '80px',
    render: (path: string) => <Link path={path} copy={i18n.LINK_COPY} />,
  },
];

export const ThreatIntelPanelView: React.FC<LinkPanelViewProps> = ({
  isInspectEnabled = true,
  listItems,
  splitPanel,
  totalCount = 0,
}) => {
  return (
    <LinkPanel
      {...{
        columns,
        dataTestSubj: 'cti-dashboard-links',
        inspectQueryId: isInspectEnabled ? CTIEventCountQueryId : undefined,
        listItems,
        panelTitle: i18n.PANEL_TITLE,
        splitPanel,
        subtitle: useMemo(
          () => (
            <FormattedMessage
              data-test-subj="cti-total-event-count"
              defaultMessage="Showing: {totalCount} {totalCount, plural, one {indicator} other {indicators}}"
              id="xpack.securitySolution.overview.ctiDashboardSubtitle"
              values={{ totalCount }}
            />
          ),
          [totalCount]
        ),
        button: useMemo(
          () => (
            <SecuritySolutionLinkButton
              data-test-subj="cti-view-indicators"
              deepLinkId={SecurityPageName.threatIntelligence}
            >
              <FormattedMessage
                id="xpack.securitySolution.overview.threatIndicatorsAction"
                defaultMessage="View indicators"
              />
            </SecuritySolutionLinkButton>
          ),
          []
        ),
      }}
    />
  );
};
