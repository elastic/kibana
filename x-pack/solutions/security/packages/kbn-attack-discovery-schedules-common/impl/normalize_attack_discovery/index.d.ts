import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
/**
 * Normalizes attack discovery objects that may arrive with snake_case keys
 * (from workflow execution output) to the camelCase format expected by
 * `generateAttackDiscoveryAlertHash`, `getAttackDiscoveryMarkdownFields`,
 * and `transformToBaseAlertDocument`.
 */
export declare const normalizeAttackDiscovery: (raw: unknown) => AttackDiscovery;
