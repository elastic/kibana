import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { LogDocument } from '../routes/ai_insights/get_log_document_by_id';
export declare const WARNING_AND_ABOVE_VALUES: string[];
export declare function warningAndAboveLogFilter(): QueryDslQueryContainer;
/**
 * Analyzes a log entry to determine if it is warning level or above
 * (warn, error, critical, fatal)
 */
export declare function isWarningOrAbove(logDocument: LogDocument): boolean;
