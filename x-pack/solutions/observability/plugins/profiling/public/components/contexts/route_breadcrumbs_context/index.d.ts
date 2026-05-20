import type { Route, RouteMatch } from '@kbn/typed-react-router-config';
import React from 'react';
export interface Breadcrumb {
    title: string;
    href: string;
}
interface BreadcrumbApi {
    set(route: Route, breadcrumb: Breadcrumb[]): void;
    unset(route: Route): void;
    getBreadcrumbs(matches: RouteMatch[]): Breadcrumb[];
}
export declare const RouteBreadcrumbsContext: React.Context<BreadcrumbApi | undefined>;
export declare function RouteBreadcrumbsContextProvider({ children }: {
    children: React.ReactElement;
}): React.JSX.Element;
export {};
