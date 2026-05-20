import type { ReactNode } from 'react';
import type { AppMountParameters } from '@kbn/core-application-browser';
export interface ApmIndicesConfig {
    error: string;
    onboarding: string;
    span: string;
    transaction: string;
    metric: string;
}
export interface UXMetrics {
    cls?: number | null;
    lcp?: number | null;
    tbt?: number;
    fcp?: number | null;
    coreVitalPages?: number;
    lcpRanks?: number[];
    clsRanks?: number[];
    inp?: number | null;
    hasINP?: boolean;
    inpRanks?: number[];
}
export interface HeaderMenuPortalProps {
    children: ReactNode;
    setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
    theme$: AppMountParameters['theme$'];
}
export interface TimePickerTimeDefaults {
    from: string;
    to: string;
}
