import * as rt from 'io-ts';
import type { DataView } from '@kbn/data-views-plugin/public';
declare const ControlPanelRT: rt.RecordC<rt.StringC, rt.IntersectionC<[rt.TypeC<{
    order: rt.NumberC;
    type: rt.StringC;
}>, rt.PartialC<{
    width: rt.UnionC<[rt.LiteralC<"medium">, rt.LiteralC<"small">, rt.LiteralC<"large">]>;
    grow: rt.BooleanC;
    dataViewId: rt.StringC;
    fieldName: rt.StringC;
    title: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
    selectedOptions: rt.ArrayC<rt.UnionC<[rt.StringC, rt.NumberC]>>;
    exclude: rt.BooleanC;
    existsSelected: rt.BooleanC;
}>]>>;
export type ControlPanels = rt.TypeOf<typeof ControlPanelRT>;
export declare const useControlPanels: (controlPanelConfigs: ControlPanels, dataView: DataView | undefined) => [ControlPanels, (state: ControlPanels) => void];
export {};
