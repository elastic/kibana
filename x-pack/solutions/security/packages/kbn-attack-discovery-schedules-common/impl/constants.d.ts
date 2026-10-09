import type { IRuleTypeAlerts } from '@kbn/alerting-plugin/server';
import type { AttackDiscoveryAlertDocument } from '@kbn/elastic-assistant-common';
export declare const SECURITY_APP_PATH: `/app/security`;
export declare const ATTACK_DISCOVERY_ALERTS_CONTEXT: 'security.attack.discovery';
export declare const ATTACK_DISCOVERY_ALERTS_AAD_CONFIG: IRuleTypeAlerts<AttackDiscoveryAlertDocument>;
