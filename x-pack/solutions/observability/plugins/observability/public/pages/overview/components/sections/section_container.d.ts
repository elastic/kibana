import React from 'react';
interface AppLink {
    label: string;
    href?: string;
    prependBasePath?: boolean;
}
interface Props {
    title: string;
    hasError: boolean;
    children: React.ReactNode;
    initialIsOpen?: boolean;
    appLink?: AppLink;
    showExperimentalBadge?: boolean;
}
export declare function SectionContainer({ title, appLink, children, hasError, initialIsOpen, showExperimentalBadge, }: Props): React.JSX.Element;
export {};
