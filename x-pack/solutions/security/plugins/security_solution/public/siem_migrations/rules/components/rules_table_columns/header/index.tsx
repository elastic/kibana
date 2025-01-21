/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiToolTip, EuiIcon } from '@elastic/eui';

interface TableHeaderProps {
  title: string;
  tooltipContent?: React.ReactNode;
}

export const TableHeader: React.FC<TableHeaderProps> = React.memo(({ title, tooltipContent }) => {
  return (
    <EuiToolTip content={tooltipContent}>
      <>
        {title}
        &nbsp;
        <EuiIcon size="s" type="questionInCircle" color="subdued" className="eui-alignTop" />
      </>
    </EuiToolTip>
  );
});
TableHeader.displayName = 'TableHeader';
