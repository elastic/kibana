import type { ApmDataAccessServices } from '@kbn/apm-data-access-plugin/server';
/**
 * Gets the preferred document source based on groupBy, filter, and data availability.
 *
 * Uses getDocumentSources to determine which document types have data for the given
 * filter and groupBy field. This automatically handles:
 * - ServiceTransactionMetric: Most efficient, but only has service.name, service.environment, transaction.type
 * - TransactionMetric: Has more dimensions (transaction.*, host.*, container.*, kubernetes.*, cloud.*, faas.*, etc.)
 * - TransactionEvent: Raw transaction docs, fallback when metrics don't have required fields
 */
export declare function getPreferredDocumentSource({ apmDataAccessServices, start, end, groupBy, kqlFilter, }: {
    apmDataAccessServices: ApmDataAccessServices;
    start: number;
    end: number;
    groupBy: string;
    kqlFilter?: string;
}): Promise<import("@kbn/apm-data-access-plugin/common").ApmDataSourceWithSummary>;
