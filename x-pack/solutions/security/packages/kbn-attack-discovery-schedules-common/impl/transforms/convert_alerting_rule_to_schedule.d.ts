import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { AttackDiscoverySchedule, AttackDiscoveryScheduleParams } from '@kbn/elastic-assistant-common';
export declare const convertAlertingRuleToSchedule: (rule: SanitizedRule<AttackDiscoveryScheduleParams>) => AttackDiscoverySchedule;
