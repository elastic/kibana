import type { AlertData } from '../../../hooks/use_fetch_alert_detail';
export declare const useFindProximalAlerts: (alertDetail: AlertData) => import("@tanstack/react-query").UseQueryResult<import("@kbn/alerts-ui-shared/src/common/apis/search_alerts/search_alerts").SearchAlertsResult, unknown>;
