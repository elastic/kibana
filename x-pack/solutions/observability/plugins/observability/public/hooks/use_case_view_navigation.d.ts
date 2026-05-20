export type NavigateToCaseView = (pathParams: {
    caseId: string;
}) => void;
export declare const useCaseViewNavigation: () => {
    navigateToCaseView: NavigateToCaseView;
};
