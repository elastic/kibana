import type { Document } from '@langchain/core/documents';
export declare const getAlertRiskScore: ({ alertIds, anonymizedAlerts, }: {
    alertIds: string[];
    anonymizedAlerts: Document[];
}) => number | undefined;
