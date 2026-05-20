import React from 'react';
import type { AlertData } from '../../hooks/use_fetch_alert_detail';
export declare const ALERT_DETAILS_PAGE_ID = "alert-details-o11y";
export declare const LOG_DOCUMENT_COUNT_RULE_TYPE_ID = "logs.alert.document.count";
export declare const METRIC_THRESHOLD_ALERT_TYPE_ID = "metrics.alert.threshold";
export declare const METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID = "metrics.alert.inventory.threshold";
export declare function AlertDetails(): React.JSX.Element;
export declare function getScreenDescription(alertDetail: AlertData): string;
