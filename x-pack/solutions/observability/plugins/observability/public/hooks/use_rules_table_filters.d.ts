import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { RuleStatus } from '@kbn/triggers-actions-ui-plugin/public';
export interface UseRulesTableFilterParams {
    urlStateStorage: IKbnUrlStateStorage;
    setRefresh: React.Dispatch<React.SetStateAction<Date>>;
}
export declare const useRulesTableFilers: ({ urlStateStorage, setRefresh }: UseRulesTableFilterParams) => {
    stateLastResponse: string[];
    stateParams: Record<string, string | number | object>;
    stateSearch: string;
    stateStatus: RuleStatus[];
    stateType: string[];
    ruleConditionsFlyoutOpen: boolean;
    ruleIdToEdit: string | null | undefined;
    handleStatusFilterChange: (newStatus: RuleStatus[]) => void;
    handleLastRunOutcomeFilterChange: (newLastResponse: string[]) => void;
    handleTypeFilterChange: (newType: string[]) => void;
    handleSearchFilterChange: (newSearch: string) => void;
    handleRuleParamFilterChange: (newParams: Record<string, string | number | object>) => void;
    setRuleIdToEdit: import("react").Dispatch<import("react").SetStateAction<string | null | undefined>>;
    navigateToEditRuleForm: (ruleId: string) => void;
    setRuleConditionsFlyoutOpen: import("react").Dispatch<import("react").SetStateAction<boolean>>;
};
