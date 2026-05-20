import React from 'react';
import type { AlertStatus } from '@kbn/rule-data-utils';
import type { TopAlert } from '../../typings/alerts';
export declare const AlertOverview: React.MemoExoticComponent<({ alert, pageId, alertStatus, }: {
    alert: TopAlert;
    pageId?: string;
    alertStatus?: AlertStatus;
}) => React.JSX.Element>;
