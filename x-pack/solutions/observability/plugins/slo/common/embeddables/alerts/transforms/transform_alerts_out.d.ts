import type { AlertsEmbeddableState } from '../../../../server/lib/embeddables/alerts_schema';
export interface LegacyAlertsSloItem {
    id: string;
    instanceId: string;
    groupBy: string[];
    name: string;
}
export interface LegacyAlertsState {
    showAllGroupByInstances: boolean;
    slos: LegacyAlertsSloItem[];
}
/** Transforms SLO Alerts embeddable state for serialization. Migrates legacy camelCase to snake_case. */
export declare function transformAlertsOut(storedState: AlertsEmbeddableState): AlertsEmbeddableState;
