import type { ApplicationStart, IUiSettingsClient, NotificationsStart } from '@kbn/core/public';
import { type CoreStart } from '@kbn/core/public';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { PublishesTitle, PublishesWritableTitle } from '@kbn/presentation-publishing';
import type { Subject } from 'rxjs';
import type { BurnRateEmbeddableState } from '../../../../common/embeddables/burn_rate/types';
/** Re-exported from common (which re-exports from server schemas) */
export type { BurnRateCustomState, BurnRateEmbeddableState, } from '../../../../common/embeddables/burn_rate/types';
export interface EmbeddableProps {
    sloId: string;
    sloInstanceId: string;
    duration: string;
    reloadSubject?: Subject<boolean>;
}
export type BurnRateApi = DefaultEmbeddableApi<BurnRateEmbeddableState> & PublishesWritableTitle & PublishesTitle;
export interface SloEmbeddableDeps {
    uiSettings: IUiSettingsClient;
    http: CoreStart['http'];
    i18n: CoreStart['i18n'];
    application: ApplicationStart;
    notifications: NotificationsStart;
}
