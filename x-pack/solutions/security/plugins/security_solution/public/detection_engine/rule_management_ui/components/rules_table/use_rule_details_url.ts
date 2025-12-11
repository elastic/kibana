import { useMemo } from "react";
import { useUserPrivileges } from "../../../../common/components/user_privileges";
import { RuleDetailTabs } from "../../../rule_details_ui/pages/rule_details/use_rule_details_tabs";
import { getRuleDetailsTabUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';

export const useRuleDetailsUrlPath = (ruleId: string, search?: string) => {
    const { alertsPrivileges, rulesPrivileges } = useUserPrivileges();
    const canReadAlerts = alertsPrivileges.alerts.read;
    const canReadExceptions = rulesPrivileges.exceptions.read;

    const ruleDetailsUrlPath = useMemo(() => {
        const landingTab = canReadAlerts
            ? RuleDetailTabs.alerts
            : canReadExceptions
                ? RuleDetailTabs.exceptions
                : RuleDetailTabs.executionResults;

        return getRuleDetailsTabUrl(ruleId, landingTab, search)
    }, [canReadAlerts, canReadExceptions])


    return { ruleDetailsUrlPath }
}