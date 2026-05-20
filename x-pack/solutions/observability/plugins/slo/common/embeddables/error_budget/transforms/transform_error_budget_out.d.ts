import type { ErrorBudgetEmbeddableState } from '../../../../server/lib/embeddables/error_budget_schema';
export interface LegacyErrorBudgetState {
    sloId: string;
    sloInstanceId?: string;
}
/**
 * Converts pre 9.4 error budget camelCase state to snake_case state.
 */
export declare function transformErrorBudgetOut(storedState: ErrorBudgetEmbeddableState): ErrorBudgetEmbeddableState;
