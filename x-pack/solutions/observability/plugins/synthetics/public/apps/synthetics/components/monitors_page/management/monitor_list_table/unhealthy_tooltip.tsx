import { i18n } from "@kbn/i18n";
import { useMonitorIntegrationHealth } from "../../../common/hooks/use_monitor_integration_health";
import { getStatusLabel } from "../../../common/hooks/status_labels";
import { EuiToolTip, EuiIcon } from "@elastic/eui";
import React from "react";

export const UnhealthyTooltip = ({ configId }: { configId: string }) => {

    const { isUnhealthy: isMonitorUnhealthy, getUnhealthyLocationStatuses } = useMonitorIntegrationHealth();

    const isUnhealthy = isMonitorUnhealthy(configId);
    const unhealthyStatuses = getUnhealthyLocationStatuses(configId);
    const tooltipContent =
        unhealthyStatuses.length > 0
            ? unhealthyStatuses
                .map(
                    (s) =>
                        `${s.locationLabel}: ${getStatusLabel(s.status) ?? UNHEALTHY_TOOLTIP_BADGE}`
                )
                .join('\n')
            : UNHEALTHY_TOOLTIP_BADGE;

    if (!isUnhealthy) {
        return null;
    }

    return (
        <EuiToolTip content={tooltipContent}>
            <EuiIcon
                type="warning"
                color="warning"
                data-test-subj="syntheticsUnhealthyTooltipBadge"
                aria-label={UNHEALTHY_TOOLTIP_BADGE}
            />
        </EuiToolTip>
    )
}


const UNHEALTHY_TOOLTIP_BADGE = i18n.translate(
    'xpack.synthetics.management.monitorList.unhealthyTooltip.badge',
    {
        defaultMessage: 'Unhealthy',
    }
);