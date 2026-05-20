import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
export declare function useSloListActions({ slo, setIsAddRuleFlyoutOpen, setIsActionsPopoverOpen, }: {
    slo: SLOWithSummaryResponse;
    setIsActionsPopoverOpen: (val: boolean) => void;
    setIsAddRuleFlyoutOpen: (val: boolean) => void;
}): {
    handleCreateRule: () => void;
    handleAttachToDashboardSave: (props: import("@kbn/saved-objects-plugin/public").OnSaveProps & {
        dashboardId: string | null;
        addToLibrary: boolean;
    }) => Promise<void>;
};
