import React from 'react';
import { type AlertDetailsRuleFormFlyoutBaseProps } from './alert_details_rule_form_flyout';
interface InvestigationGuideProps extends AlertDetailsRuleFormFlyoutBaseProps {
    blob?: string;
}
export declare function InvestigationGuide({ blob, onUpdate, refetch, rule }: InvestigationGuideProps): React.JSX.Element;
export {};
