import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
export type AssetDetailsFlyoutLocator = LocatorPublic<AssetDetailsFlyoutLocatorParams>;
export interface AssetDetailsFlyoutLocatorParams extends SerializableRecord {
    tableProperties: {
        detailsItemId: string;
        pagination?: {
            pageIndex: number;
            pageSize: number;
        };
        sorting?: {
            direction?: string;
            field: string;
        };
    };
    assetDetails: {
        tabId?: string;
        dashboardId?: string;
        dateRange?: {
            from: string;
            to: string;
        };
    };
}
export declare const ASSET_DETAILS_FLYOUT_LOCATOR_ID = "ASSET_DETAILS_FLYOUT_LOCATOR";
export declare class AssetDetailsFlyoutLocatorDefinition implements LocatorDefinition<AssetDetailsFlyoutLocatorParams> {
    readonly id = "ASSET_DETAILS_FLYOUT_LOCATOR";
    readonly getLocation: (params: AssetDetailsFlyoutLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
