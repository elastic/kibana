import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { AttackDiscoveryScheduleExecution, AttackDiscoveryScheduleParams } from '@kbn/elastic-assistant-common';
export declare const createScheduleExecutionSummary: (rule: SanitizedRule<AttackDiscoveryScheduleParams>) => AttackDiscoveryScheduleExecution | undefined;
