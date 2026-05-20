import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
export declare function createRemoteSloDetailsUrl(slo: SLOWithSummaryResponse, spaceId?: string): string | undefined;
export declare function createRemoteSloDeleteUrl(slo: SLOWithSummaryResponse, spaceId?: string): string | undefined;
export declare function createRemoteSloResetUrl(slo: SLOWithSummaryResponse, spaceId?: string): string | undefined;
export declare function createRemoteSloEnableUrl(slo: SLOWithSummaryResponse, spaceId?: string): string | undefined;
export declare function createRemoteSloDisableUrl(slo: SLOWithSummaryResponse, spaceId?: string): string | undefined;
export declare function createRemoteSloEditUrl(slo: SLOWithSummaryResponse, spaceId?: string): string | undefined;
export declare function createRemoteSloCloneUrl(slo: SLOWithSummaryResponse, spaceId?: string): string | undefined;
