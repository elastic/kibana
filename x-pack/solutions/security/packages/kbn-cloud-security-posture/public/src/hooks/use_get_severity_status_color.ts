import { useEuiTheme } from '@elastic/eui';
import { VulnSeverity } from '@kbn/cloud-security-posture-common';

import { getSeverityStatusColor as getSeverityStatusColorUtil } from '../..';

export const useGetSeverityStatusColor = () => {
    const { euiTheme } = useEuiTheme();
    const getSeverityStatusColor = (status: VulnSeverity) => {
        return getSeverityStatusColorUtil(status, euiTheme);
    };
    return { getSeverityStatusColor };
};