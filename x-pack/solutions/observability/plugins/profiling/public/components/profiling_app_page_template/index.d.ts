import type { EuiPageHeaderContentProps } from '@elastic/eui';
import React from 'react';
import type { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';
export declare function ProfilingAppPageTemplate({ children, tabs, hideSearchBar, noDataConfig, restrictWidth, pageTitle, showBetaBadge, customSearchBar, }: {
    children: React.ReactElement;
    tabs?: EuiPageHeaderContentProps['tabs'];
    hideSearchBar?: boolean;
    noDataConfig?: NoDataPageProps;
    restrictWidth?: boolean;
    pageTitle?: React.ReactNode;
    showBetaBadge?: boolean;
    customSearchBar?: React.ReactNode;
}): React.JSX.Element;
