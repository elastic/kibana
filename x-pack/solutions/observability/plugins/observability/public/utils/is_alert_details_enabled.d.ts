import type { ConfigSchema } from '../plugin';
import type { TopAlert } from '../typings/alerts';
export declare const isAlertDetailsEnabledPerApp: (alert: TopAlert | null, config: ConfigSchema | null) => boolean;
