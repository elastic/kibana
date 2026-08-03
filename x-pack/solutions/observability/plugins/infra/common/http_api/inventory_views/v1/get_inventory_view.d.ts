import * as rt from 'io-ts';
import type { inventoryViewRT } from '../../../inventory_views';
export declare const getInventoryViewRequestParamsRT: rt.TypeC<{
    inventoryViewId: rt.StringC;
}>;
export type GetInventoryViewResposePayload = rt.TypeOf<typeof inventoryViewRT>;
