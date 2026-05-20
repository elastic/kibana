import type { EuiBasicTableColumn } from '@elastic/eui';
interface AlertOverviewField {
    id: string;
    key: string;
    value?: string | string[] | number | number[] | Record<string, any>;
    meta?: Record<string, any>;
}
export declare const ColumnIDs: {
    readonly STATUS: "status";
    readonly SOURCE: "source";
    readonly TRIGGERED: "triggered";
    readonly DURATION: "duration";
    readonly OBSERVED_VALUE: "observed_value";
    readonly THRESHOLD: "threshold";
    readonly RULE_NAME: "rule_name";
    readonly RULE_TYPE: "rule_type";
    readonly CASES: "cases";
    readonly WORKFLOW_TAGS: "workflow_tags";
};
export declare const overviewColumns: Array<EuiBasicTableColumn<AlertOverviewField>>;
export {};
