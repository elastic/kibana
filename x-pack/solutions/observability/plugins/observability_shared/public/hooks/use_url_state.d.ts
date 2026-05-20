import type { RisonValue } from '@kbn/rison';
export declare const useUrlState: <State>({ defaultState, decodeUrlState, encodeUrlState, urlStateKey, writeDefaultState, }: {
    defaultState: State;
    decodeUrlState: (value: RisonValue | undefined) => State | undefined;
    encodeUrlState: (value: State) => RisonValue | undefined;
    urlStateKey: string;
    writeDefaultState?: boolean;
}) => [State, (patch: State | undefined | ((prevState: State) => State)) => void];
export declare const decodeRisonUrlState: (value: string | undefined | null) => RisonValue | undefined;
