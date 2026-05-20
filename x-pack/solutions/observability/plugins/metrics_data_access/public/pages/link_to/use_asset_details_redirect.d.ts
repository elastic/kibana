import type { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import type { DataSchemaFormat, InventoryItemType } from '../../../common/inventory_models/types';
interface QueryParams {
    from?: number;
    to?: number;
    name?: string;
}
export declare const useAssetDetailsRedirect: () => {
    getAssetDetailUrl: ({ entityType, entityId, search, preferredSchema, }: {
        entityType: InventoryItemType;
        entityId: string;
        search: QueryParams;
        preferredSchema?: DataSchemaFormat;
    }) => RouterLinkProps;
};
export {};
