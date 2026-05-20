import type { BudgetingMethod, Indicator, TimeWindowType, IndicatorType as IndicatorTypeSchema } from '@kbn/slo-schema';
export interface CreateSLOForm<IndicatorType = Indicator> {
    name: string;
    description: string;
    indicator: IndicatorType;
    timeWindow: {
        duration: string;
        type: TimeWindowType;
    };
    tags: string[];
    budgetingMethod: BudgetingMethod;
    objective: {
        target: number;
        timesliceTarget?: number;
        timesliceWindow?: string;
    };
    groupBy: string[] | string;
    settings: {
        preventInitialBackfill: boolean;
        syncDelay: number;
        frequency: number;
        syncField: string | null;
    };
    artifacts?: {
        dashboards?: {
            id: string;
        }[];
    };
}
export interface FormSettings {
    isEditMode?: boolean;
    allowedIndicatorTypes?: IndicatorTypeSchema[];
}
