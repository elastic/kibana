import type { SloTabId } from '@kbn/deeplinks-observability';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    slo?: SLOWithSummaryResponse | null;
    isAutoRefreshing: boolean;
    selectedTabId: SloTabId;
    setSelectedTabId?: (val: SloTabId) => void;
}
export declare const useSloDetailsTabs: ({ slo, isAutoRefreshing, selectedTabId, setSelectedTabId, }: Props) => {
    tabs: ({
        onClick: () => void;
        id: string;
        label: string;
        'data-test-subj': string;
        isSelected: boolean;
    } | {
        href: string | undefined;
        id: string;
        label: string;
        'data-test-subj': string;
        isSelected: boolean;
    } | {
        onClick: () => void;
        id: string;
        label: string | React.JSX.Element;
        'data-test-subj': string;
        disabled: boolean;
        isSelected: boolean;
        append: React.JSX.Element | null;
    } | {
        href: string | undefined;
        id: string;
        label: string | React.JSX.Element;
        'data-test-subj': string;
        disabled: boolean;
        isSelected: boolean;
        append: React.JSX.Element | null;
    })[];
};
export {};
