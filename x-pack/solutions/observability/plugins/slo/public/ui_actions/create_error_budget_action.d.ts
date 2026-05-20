import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { type UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { SLOPublicPluginsStart } from '..';
import type { SLORepositoryClient } from '../types';
export declare function createAddErrorBudgetPanelAction(coreStart: CoreStart, pluginsStart: SLOPublicPluginsStart, sloClient: SLORepositoryClient): UiActionsActionDefinition<EmbeddableApiContext>;
