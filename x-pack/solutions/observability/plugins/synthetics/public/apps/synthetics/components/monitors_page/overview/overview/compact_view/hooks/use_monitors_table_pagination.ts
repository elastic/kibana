/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Criteria } from '@elastic/eui';
import { useState } from 'react';
import { OverviewStatusMetaData } from '../../../../../../../../../common/runtime_types';

const findMonitors = (monitors: OverviewStatusMetaData[], pageIndex: number, pageSize: number) => {
  let pageOfItems;

  if (!pageIndex && !pageSize) {
    pageOfItems = monitors;
  } else {
    const startIndex = pageIndex * pageSize;
    pageOfItems = monitors.slice(startIndex, Math.min(startIndex + pageSize, monitors.length));
  }

  return {
    pageOfItems,
    totalItemCount: monitors.length,
  };
};

export const useMonitorsTablePagination = ({
  totalItems,
}: {
  totalItems: OverviewStatusMetaData[];
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  const onTableChange = ({ page }: Criteria<OverviewStatusMetaData>) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  const { pageOfItems, totalItemCount } = findMonitors(totalItems, pageIndex, pageSize);

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: [2, 5, 10],
  };

  return { onTableChange, pageOfItems, pagination };
};
