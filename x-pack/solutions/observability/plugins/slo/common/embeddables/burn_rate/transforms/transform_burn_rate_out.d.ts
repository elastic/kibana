import type { BurnRateEmbeddableState } from '../types';
export interface LegacyBurnRateState {
    sloId: string;
    sloInstanceId?: string;
}
/**
 * Converts pre 9.4 burn rate camelCase state to snake_case state.
 */
export declare function transformBurnRateOut(storedState: BurnRateEmbeddableState): BurnRateEmbeddableState;
