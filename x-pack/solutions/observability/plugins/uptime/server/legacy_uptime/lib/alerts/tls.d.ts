import type { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import type { UptimeAlertTypeFactory } from './types';
import { TLS } from '../../../../common/constants/uptime_alerts';
import type { Cert } from '../../../../common/runtime_types';
export type ActionGroupIds = ActionGroupIdsOf<typeof TLS>;
interface TlsAlertState {
    commonName: string;
    issuer: string;
    summary: string;
    status: string;
}
export declare const getCertSummary: (cert: Cert, expirationThreshold: number, ageThreshold: number) => TlsAlertState;
export declare const tlsAlertFactory: UptimeAlertTypeFactory<ActionGroupIds>;
export {};
