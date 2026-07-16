import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
export declare const FORENSIC_HOSTS: {
    /** Patient zero — receptionist workstation, first infection via phishing. */
    readonly patientZero: "WKSTN-RECV01";
    /** Lateral-movement target — the domain controller, ransomware detonation. */
    readonly domainController: "SRV-DC01";
};
declare const AGENT_IDS: {
    readonly "WKSTN-RECV01": "eval-agent-forensic-wkstn-recv01";
    readonly "SRV-DC01": "eval-agent-forensic-srv-dc01";
};
/**
 * Bulk-index the ordered kill chain into `logs-endpoint.events.*`. Idempotent when
 * paired with cleanupSeededData() in beforeAll (which reclaims by `eval-agent-` prefix).
 */
export declare function seedForensicTimeline({ esClient }: {
    esClient: Client;
}, log: ToolingLog, baseTime?: Date, 
/**
 * Maps a seeded host to a REAL Fleet-enrolled agent UUID. Required for any
 * environment where Osquery live queries must resolve `agent.id` from
 * telemetry to an actually-enrolled agent (e.g. the BlackHat live demo) —
 * without this, the synthetic `eval-agent-forensic-*` id is written instead
 * and any live query dispatched against it hangs forever (no such agent).
 * Omit for eval-suite runs, where no live Osquery dispatch happens.
 */
agentIdOverrides?: Partial<Record<keyof typeof AGENT_IDS, string>>): Promise<void>;
export {};
