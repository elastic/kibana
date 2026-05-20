import React from 'react';
import type { Group, TimeRange } from '../../../common/typings';
/**
 * Identifies the UI section that contains the alert source links.
 * Used as the `data-ebt-element` value for click telemetry, so
 * analytics can distinguish clicks coming from the alert details
 * page vs. the alert flyout.
 */
export declare const ALERT_SOURCES_ELEMENT: {
    readonly ALERT_DETAILS: "alertDetailsSources";
    readonly ALERT_FLYOUT: "alertFlyoutSources";
};
export type AlertSourcesElement = (typeof ALERT_SOURCES_ELEMENT)[keyof typeof ALERT_SOURCES_ELEMENT];
export declare function Groups({ groups, timeRange, alertRuleTypeId, element, }: {
    groups: Group[];
    timeRange: TimeRange;
    alertRuleTypeId: string;
    element: AlertSourcesElement;
}): React.JSX.Element;
