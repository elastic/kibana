import type { CoreStart } from '@kbn/core/public';
import type { SLOPublicPluginsStart } from '../../..';
import type { ErrorBudgetCustomState } from '../../../../common/embeddables/error_budget/types';
import type { SLORepositoryClient } from '../../../types';
export declare function openSloConfiguration(coreStart: CoreStart, pluginsStart: SLOPublicPluginsStart, sloClient: SLORepositoryClient): Promise<ErrorBudgetCustomState>;
