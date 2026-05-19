import type { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import type { LegacyUptimeRuleTypeFactory } from './types';
import { TLS_LEGACY } from '../../../../common/constants/uptime_alerts';
import type { Cert } from '../../../../common/runtime_types';
export type ActionGroupIds = ActionGroupIdsOf<typeof TLS_LEGACY>;
interface TlsAlertState {
    count: number;
    agingCount: number;
    agingCommonNameAndDate: string;
    expiringCount: number;
    expiringCommonNameAndDate: string;
    hasAging: true | null;
    hasExpired: true | null;
}
export declare const getCertSummary: (certs: Cert[], expirationThreshold: number, ageThreshold: number, maxSummaryItems?: number) => TlsAlertState;
export declare const tlsLegacyRuleFactory: LegacyUptimeRuleTypeFactory<ActionGroupIds>;
export {};
