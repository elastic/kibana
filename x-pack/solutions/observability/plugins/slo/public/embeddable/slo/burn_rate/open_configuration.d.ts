import type { CoreStart } from '@kbn/core/public';
import type { SLOPublicPluginsStart } from '../../..';
import type { SLORepositoryClient } from '../../../types';
import type { BurnRateEmbeddableState } from './types';
export declare function openConfiguration(coreStart: CoreStart, pluginsStart: SLOPublicPluginsStart, sloClient: SLORepositoryClient, initialState?: BurnRateEmbeddableState): Promise<BurnRateEmbeddableState>;
