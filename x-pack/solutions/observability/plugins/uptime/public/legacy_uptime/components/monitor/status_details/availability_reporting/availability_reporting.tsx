/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Criteria, Pagination } from '@elastic/eui';
import { EuiBasicTable, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { StatusTag } from './location_status_tags';
import { TagLabel } from './tag_label';
import { AvailabilityLabel, LastCheckLabel, LocationLabel } from '../translations';

interface Props {
  allLocations: StatusTag[];
}

export const formatAvailabilityValue = (val: number) => {
  const result = Math.round(val * 100) / 100;
  return result.toFixed(2);
};

export const AvailabilityReporting: React.FC<Props> = ({ allLocations }) => {
  const [pageIndex, setPageIndex] = useState(0);

  const cols = [
    {
      field: 'label',
      name: LocationLabel,
      truncateText: true,
      render: (val: string, item: StatusTag) => {
        return <TagLabel {...item} />;
      },
    },
    {
      field: 'availability',
      name: AvailabilityLabel,
      align: 'right' as const,
      render: (val: number) => {
        return (
          <span>
            <FormattedMessage
              id="xpack.uptime.availabilityLabelText"
              defaultMessage="{value} %"
              values={{ value: formatAvailabilityValue(val) }}
              description="A percentage value, like 23.5%"
            />
          </span>
        );
      },
    },
    {
      name: LastCheckLabel,
      field: 'timestamp',
      align: 'right' as const,
    },
  ];
  const pageSize = 5;

  const pagination: Pagination = {
    pageIndex,
    pageSize,
    totalItemCount: allLocations.length,
    showPerPageOptions: false,
  };

  const onTableChange = ({ page }: Criteria<StatusTag>) => {
    setPageIndex(page?.index ?? 0);
  };

  const paginationProps = allLocations.length > pageSize ? { pagination } : {};

  return (
    <>
      <EuiSpacer size="s" />
      <EuiBasicTable
        responsiveBreakpoint={false}
        compressed={true}
        columns={cols}
        items={allLocations.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)}
        onChange={onTableChange}
        tableCaption={i18n.translate('xpack.uptime.availabilityReporting.tableCaption', {
          defaultMessage: 'Availability overview',
        })}
        {...paginationProps}
      />
    </>
  );
};
