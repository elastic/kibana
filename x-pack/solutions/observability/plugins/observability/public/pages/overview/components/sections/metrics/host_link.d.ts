import React from 'react';
import type { StringOrNull } from '../../../../..';
interface Props {
    name: StringOrNull;
    id: string;
    timerange: {
        from: number;
        to: number;
    };
}
export declare function HostLink({ name, id, timerange }: Props): React.JSX.Element;
export {};
