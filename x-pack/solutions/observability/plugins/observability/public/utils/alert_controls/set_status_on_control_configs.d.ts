import type { Writable } from '@kbn/utility-types';
import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import type { AlertStatus } from '../../../common/typings';
export declare function setStatusOnControlConfigs(status: AlertStatus, controlConfigs?: Writable<FilterControlConfig>[]): Writable<FilterControlConfig>[];
