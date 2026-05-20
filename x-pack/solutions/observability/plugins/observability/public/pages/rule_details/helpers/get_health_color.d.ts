import type { RuleExecutionStatuses } from '@kbn/alerting-plugin/common';
export declare function getHealthColor(status: RuleExecutionStatuses): "warning" | "primary" | "success" | "danger" | "accent" | "subdued";
