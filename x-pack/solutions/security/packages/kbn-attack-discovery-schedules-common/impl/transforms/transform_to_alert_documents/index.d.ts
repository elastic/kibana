import type { Alert } from '@kbn/alerts-as-data-utils';
import type { AttackDiscovery, Replacements, CreateAttackDiscoveryAlertsParams } from '@kbn/elastic-assistant-common';
import { ALERT_INSTANCE_ID, ALERT_URL, ALERT_UUID } from '@kbn/rule-data-utils';
import type { AttackDiscoveryAlertDocument } from '../../types';
import { getGenerationSourceHashSuffix } from './get_generation_source_hash_suffix';
export { getGenerationSourceHashSuffix };
export type AttackDiscoveryAlertDocumentBase = Omit<AttackDiscoveryAlertDocument, keyof Omit<Alert, typeof ALERT_URL | typeof ALERT_UUID | typeof ALERT_INSTANCE_ID>>;
export declare const generateAttackDiscoveryAlertHash: ({ attackDiscovery, computeSha256Hash, connectorId, generationSource, ownerId, replacements, spaceId, }: {
    attackDiscovery: AttackDiscovery;
    computeSha256Hash: (input: string) => string;
    connectorId: string;
    generationSource?: string;
    ownerId: string;
    replacements: Replacements | undefined;
    spaceId: string;
}) => string;
export declare const transformToBaseAlertDocument: ({ alertDocId, alertInstanceId, attackDiscovery, alertsParams, generationSource, publicBaseUrl, spaceId, timestamp, }: {
    alertDocId: string;
    alertInstanceId: string;
    attackDiscovery: AttackDiscovery;
    alertsParams: Omit<CreateAttackDiscoveryAlertsParams, 'attackDiscoveries' | 'generationUuid'>;
    generationSource?: string;
    publicBaseUrl?: string;
    spaceId: string;
    timestamp?: string;
}) => AttackDiscoveryAlertDocumentBase;
