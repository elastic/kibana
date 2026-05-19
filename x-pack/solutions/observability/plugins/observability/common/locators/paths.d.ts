export declare const OBSERVABILITY_BASE_PATH = "/app/observability";
export declare const ROOT_PATH: "/";
export declare const LANDING_PATH: "/landing";
export declare const OVERVIEW_PATH: "/overview";
export declare const ALERTS_PATH: "/alerts";
export declare const ALERT_DETAIL_PATH: "/alerts/:alertId";
export declare const EXPLORATORY_VIEW_PATH: "/exploratory-view";
export declare const RULES_PATH: "/alerts/rules";
export declare const RULES_LOGS_PATH: "/alerts/rules/logs";
export declare const RULE_DETAIL_PATH: "/alerts/rules/:ruleId";
export declare const CREATE_RULE_PATH: "/alerts/rules/create/:ruleTypeId";
export declare const CREATE_RULE_FROM_TEMPLATE_PATH: "/alerts/rules/create/template/:templateId";
export declare const EDIT_RULE_PATH: "/alerts/rules/edit/:id";
export declare const CASES_PATH: "/cases";
export declare const ANNOTATIONS_PATH: "/annotations";
export declare const SETTINGS_PATH: "/slos/settings";
export declare const OLD_SLOS_PATH: "/slos";
export declare const OLD_SLOS_WELCOME_PATH: "/slos/welcome";
export declare const OLD_SLOS_OUTDATED_DEFINITIONS_PATH: "/slos/outdated-definitions";
export declare const OLD_SLO_DETAIL_PATH: "/slos/:sloId";
export declare const OLD_SLO_EDIT_PATH: "/slos/edit/:sloId";
export declare const SLO_DETAIL_PATH: "/:sloId";
export declare const paths: {
    observability: {
        alerts: string;
        annotations: string;
        alertDetails: (alertId: string) => string;
        rules: string;
        ruleDetails: (ruleId: string) => string;
        createRule: (ruleTypeId: string) => string;
        createRuleFromTemplate: (templateId: string) => string;
        editRule: (id: string) => string;
    };
};
export declare const relativePaths: {
    observability: {
        ruleDetails: (ruleId: string) => string;
        editRule: (id: string) => string;
    };
};
