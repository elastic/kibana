import { EuiFlexItem, EuiToolTip, EuiBadge } from "@elastic/eui"
import { i18n } from "@kbn/i18n"
import React from "react"
import { useMonitorIntegrationHealth } from "../../common/hooks/use_monitor_integration_health";

export const UnhealthyCountBadge = ({ item } : {
    item: { id: string }
}) => {

    const { getUnhealthyMonitorCountForLocation } =
    useMonitorIntegrationHealth();

    const unhealthyMonitorCount = getUnhealthyMonitorCountForLocation(item.id);
    
    if (unhealthyMonitorCount === 0) {
        return null;
    }

    return (
        <EuiFlexItem grow={false}>
            <EuiToolTip content={UNHEALTHY_MONITORS_TOOLTIP}>
                <EuiBadge
                    color="warning"
                    data-test-subj="syntheticsLocationMissingIntegrationBadge"
                >
                    {i18n.translate(
                        'xpack.synthetics.privateLocations.missingIntegrations.count',
                        {
                            defaultMessage:
                                '{count} {count, plural, one {unhealthy} other {unhealthy}}',
                            values: { count: unhealthyMonitorCount },
                        }
                    )}
                </EuiBadge>
            </EuiToolTip>
        </EuiFlexItem>
    )
}

const UNHEALTHY_MONITORS_TOOLTIP = i18n.translate(
    'xpack.synthetics.privateLocations.missingIntegrations.tooltip',
    {
        defaultMessage:
            'These monitors are unhealthy and will not run until they are resolved.',
    }
);