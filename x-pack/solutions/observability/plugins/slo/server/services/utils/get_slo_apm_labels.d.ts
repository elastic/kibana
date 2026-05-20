import type { SLODefinition } from '../../domain/models';
export declare const getSloApmLabels: (slo: SLODefinition) => {
    slo_indicator_type: "sli.apm.transactionDuration" | "sli.apm.transactionErrorRate" | "sli.kql.custom" | "sli.metric.timeslice" | "sli.metric.custom" | "sli.histogram.custom" | "sli.synthetics.availability";
    slo_budgeting_method: "occurrences" | "timeslices";
    slo_time_window: string;
    slo_has_group_by: boolean;
    slo_prevent_initial_backfill: boolean;
};
