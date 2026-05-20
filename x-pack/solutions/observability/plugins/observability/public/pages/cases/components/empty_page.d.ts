import type { IconType } from '@elastic/eui';
import type { MouseEventHandler, ReactNode } from 'react';
import React from 'react';
interface EmptyPageActions {
    icon?: IconType;
    label: string;
    target?: string;
    url: string;
    descriptionTitle?: string;
    description?: string;
    fill?: boolean;
    onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
}
export type EmptyPageActionsProps = Record<string, EmptyPageActions>;
interface EmptyPageProps {
    actions: EmptyPageActionsProps;
    'data-test-subj'?: string;
    message?: ReactNode;
    title: string;
}
export declare const EmptyPage: React.MemoExoticComponent<React.NamedExoticComponent<EmptyPageProps>>;
export {};
