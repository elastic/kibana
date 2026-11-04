/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { HuntLibraryListItem } from '../../../common/hunt_library';
import { HuntAvailabilityBadge } from './hunt_availability_badge';
import * as i18n from './translations';

interface HuntLibraryTableProps {
  hunts: HuntLibraryListItem[];
  onSelect: (huntId: string) => void;
  /** Link target for a hunt, so a middle or modified click opens it in a new tab. */
  getHref: (huntId: string) => string;
}

const descriptionClamp = css`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const HuntLibraryTable: React.FC<HuntLibraryTableProps> = ({ hunts, onSelect, getHref }) => {
  const columns: Array<EuiBasicTableColumn<HuntLibraryListItem>> = [
    {
      field: 'name',
      name: i18n.COLUMN_NAME,
      width: '46%',
      render: (name: string, { id, description }) => (
        <div>
          <EuiLink
            href={getHref(id)}
            onClick={(event: React.MouseEvent) => {
              // Let modified clicks fall through to the browser.
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
              event.preventDefault();
              onSelect(id);
            }}
            data-test-subj={`alertZeroHuntOpen-${id}`}
          >
            {name}
          </EuiLink>
          <EuiText size="xs" color="subdued" css={descriptionClamp}>
            {description}
          </EuiText>
        </div>
      ),
    },
    {
      field: 'platform',
      name: i18n.COLUMN_PLATFORM,
      width: '12%',
      render: (platform: string[]) => (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {platform.map((value) => (
            <EuiFlexItem grow={false} key={value}>
              <EuiBadge color="hollow">{value}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'mitreTechniques',
      name: i18n.COLUMN_MITRE,
      width: '16%',
      render: (techniques: string[]) => techniques.join(', '),
    },
    {
      field: 'resultKind',
      name: i18n.COLUMN_RESULT,
      width: '12%',
      render: (kind: HuntLibraryListItem['resultKind']) =>
        kind === 'aggregate' ? i18n.RESULT_AGGREGATE : i18n.RESULT_RAW_EVENT,
    },
    {
      field: 'availability',
      name: i18n.COLUMN_AVAILABILITY,
      width: '14%',
      render: (availability: HuntLibraryListItem['availability'], { id }) => (
        <HuntAvailabilityBadge
          availability={availability}
          data-test-subj={`alertZeroHuntAvailability-${id}`}
        />
      ),
    },
  ];

  return (
    <EuiBasicTable
      tableCaption={i18n.TABLE_CAPTION}
      tableLayout="fixed"
      items={hunts}
      columns={columns}
      rowProps={({ id }) => ({ 'data-test-subj': `alertZeroHuntRow-${id}` })}
      data-test-subj="alertZeroHuntLibraryTable"
    />
  );
};
