import type { CoreStart } from '@kbn/core/public';
import type { SLOPublicPluginsStart } from '../../..';
import type { SLORepositoryClient } from '../../../types';
import type { GroupOverviewCustomState, SingleOverviewCustomState } from '../../../../common/embeddables/overview/types';
export declare function openSloConfiguration(coreStart: CoreStart, pluginsStart: SLOPublicPluginsStart, sloClient: SLORepositoryClient, initialState?: GroupOverviewCustomState): Promise<GroupOverviewCustomState | SingleOverviewCustomState>;
