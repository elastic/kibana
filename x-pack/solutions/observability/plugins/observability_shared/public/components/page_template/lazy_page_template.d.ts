import React from 'react';
import type { ObservabilityPageTemplateDependencies, WrappedPageTemplateProps } from './page_template';
export declare const LazyObservabilityPageTemplate: React.LazyExoticComponent<typeof import("./page_template").ObservabilityPageTemplate>;
export type LazyObservabilityPageTemplateProps = WrappedPageTemplateProps;
export declare function createLazyObservabilityPageTemplate({ isSidebarEnabled$, ...injectedDeps }: ObservabilityPageTemplateDependencies): (pageTemplateProps: LazyObservabilityPageTemplateProps) => React.JSX.Element;
