import type { CoreSetup } from '@kbn/core/public';
import type { UiActionsPublicSetup } from '@kbn/ui-actions-plugin/public/plugin';
import type { SLOPublicPluginsStart } from '..';
import type { SLORepositoryClient } from '../types';
export declare function registerSloUiActions(uiActions: UiActionsPublicSetup, core: CoreSetup<SLOPublicPluginsStart>, sloClient: SLORepositoryClient): void;
