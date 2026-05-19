import { type EuiPageSectionProps } from '@elastic/eui';
import type { _EuiPageBottomBarProps } from '@elastic/eui/src/components/page_template/bottom_bar/page_bottom_bar';
import React from 'react';
import type { BehaviorSubject, Observable } from 'rxjs';
import type { ApplicationStart } from '@kbn/core/public';
import type { KibanaPageTemplateProps, KibanaPageTemplateKibanaDependencies } from '@kbn/shared-ux-page-kibana-template';
export type WrappedPageTemplateProps = Pick<KibanaPageTemplateProps, 'children' | 'data-test-subj' | 'pageHeader' | 'restrictWidth' | 'isEmptyState' | 'noDataConfig' | 'paddingSize'> & {
    showSolutionNav?: boolean;
    isPageDataLoaded?: boolean;
    pageSectionProps?: EuiPageSectionProps;
    bottomBar?: React.ReactNode;
    bottomBarProps?: _EuiPageBottomBarProps;
};
export interface NavigationEntry {
    label: string;
    app: string;
    path: string;
    matchFullPath?: boolean;
    ignoreTrailingSlash?: boolean;
    onClick?: (event: React.MouseEvent<HTMLElement | HTMLButtonElement, MouseEvent>) => void;
    isNewFeature?: boolean;
    isTechnicalPreview?: boolean;
    isBetaFeature?: boolean;
    matchPath?: (path: string) => boolean;
}
export interface NavigationSection {
    label: string | undefined;
    sortKey: number;
    entries: NavigationEntry[];
    isBetaFeature?: boolean;
}
export interface ObservabilityPageTemplateDependencies {
    currentAppId$: Observable<string | undefined>;
    getUrlForApp: ApplicationStart['getUrlForApp'];
    navigateToApp: ApplicationStart['navigateToApp'];
    navigationSections$: Observable<NavigationSection[]>;
    getPageTemplateServices: () => KibanaPageTemplateKibanaDependencies;
    isSidebarEnabled$: BehaviorSubject<boolean>;
}
export type ObservabilityPageTemplateProps = Omit<ObservabilityPageTemplateDependencies, 'isSidebarEnabled$'> & WrappedPageTemplateProps;
export declare function ObservabilityPageTemplate({ children, currentAppId$, getUrlForApp, navigateToApp, navigationSections$, showSolutionNav, isPageDataLoaded, getPageTemplateServices, bottomBar, bottomBarProps, pageSectionProps, ...pageTemplateProps }: ObservabilityPageTemplateProps): React.ReactElement | null;
export default ObservabilityPageTemplate;
export declare const LazyObservabilityPageTemplate: React.LazyExoticComponent<typeof ObservabilityPageTemplate>;
export type LazyObservabilityPageTemplateProps = WrappedPageTemplateProps;
export declare function createLazyObservabilityPageTemplate(injectedDeps: ObservabilityPageTemplateDependencies): (pageTemplateProps: LazyObservabilityPageTemplateProps) => React.JSX.Element;
