import type { MountPoint } from '@kbn/core/public';
import type { CaseUI } from '@kbn/cases-plugin/common';
import type { AddToCaseProps } from '../header/add_to_case_action';
export declare const useAddToCase: ({ lensAttributes, getToastText, timeRange, appId, owner, }: AddToCaseProps & {
    appId?: "securitySolutionUI" | "observability";
    getToastText: (thaCase: CaseUI) => MountPoint<HTMLElement>;
}) => {
    onCaseClicked: (theCase?: CaseUI) => void;
    isSaving: boolean;
    isCasesOpen: boolean;
    setIsCasesOpen: import("react").Dispatch<import("react").SetStateAction<boolean>>;
};
