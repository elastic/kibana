import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { Reference } from '@kbn/content-management-utils';
import type { ReferencedPanelAttributesWithReferences } from './helpers';
export declare class ReferencedPanelManager {
    private logger;
    private soClient;
    private panelsById;
    private panelUidToId;
    private panelsTypeById;
    constructor(logger: Logger, soClient: SavedObjectsClientContract);
    fetchReferencedPanels(): Promise<void>;
    getByUid(uid: string): ReferencedPanelAttributesWithReferences | undefined;
    addReferencedPanel({ dashboardId, references, panel, }: {
        dashboardId: string;
        references: Reference[];
        panel: DashboardPanel;
    }): void;
}
