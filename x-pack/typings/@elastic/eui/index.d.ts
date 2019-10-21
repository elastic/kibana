/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// TODO: Remove once typescript definitions are in EUI

declare module '@elastic/eui' {
  import { CommonProps } from '@elastic/eui';

  export const EuiDescribedFormGroup: React.SFC<any>;
  export const EuiCodeEditor: React.SFC<any>;
  export const Query: any;

  type EuiSideNavProps = CommonProps & {
    style?: any;
    items: Array<{
      id: string | number;
      name: string;
      items: Array<{
        id: string;
        name: string;
        onClick: () => void;
      }>;
    }>;
    mobileTitle?: React.ReactNode;
    toggleOpenOnMobile?: () => void;
    isOpenOnMobile?: boolean;
  };
  export const EuiSideNav: React.SFC<EuiSideNavProps>;

  type EuiInMemoryTableProps = CommonProps & {
    items?: any;
    columns?: any;
    sorting?: any;
    search?: any;
    selection?: any;
    pagination?: any;
    itemId?: any;
    isSelectable?: any;
    loading?: any;
    hasActions?: any;
    message?: any;
    rowProps?: any;
    cellProps?: any;
    responsive?: boolean;
  };
  export const EuiInMemoryTable: React.SFC<EuiInMemoryTableProps>;
  export const EuiBasicTable: React.SFC<any>;
}

declare module '@elastic/eui/lib/services' {
  export const RIGHT_ALIGNMENT: any;
}

declare module '@elastic/eui/lib/services/format' {
  export const dateFormatAliases: any;
}
