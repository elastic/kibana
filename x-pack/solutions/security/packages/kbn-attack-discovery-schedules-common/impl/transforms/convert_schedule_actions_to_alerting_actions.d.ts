import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { AttackDiscoveryScheduleAction, AttackDiscoveryScheduleGeneralAction, AttackDiscoveryScheduleSystemAction } from '@kbn/elastic-assistant-common';
export declare const convertScheduleActionsToAlertingActions: ({ actionsClient, scheduleActions, }: {
    actionsClient: ActionsClient;
    scheduleActions: AttackDiscoveryScheduleAction[] | undefined;
}) => {
    actions: AttackDiscoveryScheduleGeneralAction[];
    systemActions: AttackDiscoveryScheduleSystemAction[];
};
