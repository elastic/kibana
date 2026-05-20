import type { SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
interface AppState {
    range: {
        from: Date;
        to: Date;
    };
}
export declare function useUrlAppState(slo: SLOWithSummaryResponse | SLODefinitionResponse): {
    state: AppState;
    updateState: (state: AppState) => void;
};
export declare function getDefaultRangeFromSlo(slo: SLOWithSummaryResponse | SLODefinitionResponse): AppState['range'];
export {};
