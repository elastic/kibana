import type { CoreStart } from '@kbn/core/public';
import type { SLOPublicPluginsStart } from '../../..';
import type { SLORepositoryClient } from '../../../types';
import type { AlertsCustomState } from './types';
export declare function openSloConfiguration(coreStart: CoreStart, pluginsStart: SLOPublicPluginsStart, sloClient: SLORepositoryClient, initialState?: AlertsCustomState): Promise<AlertsCustomState>;
