import React from 'react';
export interface AlertEventProps {
    alertId: string;
    totalAlerts: number;
    savedObjectId: string;
    rule: {
        id: string | null;
        name: string | null;
    } | null | undefined;
}
export declare function AlertEvent({ alertId, totalAlerts, savedObjectId, rule }: AlertEventProps): React.JSX.Element;
