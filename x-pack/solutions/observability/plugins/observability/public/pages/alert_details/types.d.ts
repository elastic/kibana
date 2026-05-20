import type { ReactNode } from 'react';
export interface AlertDetailsSource {
    label: ReactNode | string;
    value: ReactNode | string | number;
}
export interface AlertDetailsAppSectionProps {
    setSources: React.Dispatch<React.SetStateAction<AlertDetailsSource[] | undefined>>;
}
export declare const TAB_IDS: readonly ["overview", "metadata", "related_alerts", "investigation_guide", "related_dashboards"];
export type TabId = (typeof TAB_IDS)[number];
