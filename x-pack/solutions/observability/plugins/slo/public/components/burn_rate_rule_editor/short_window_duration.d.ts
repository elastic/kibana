import React from 'react';
import type { Duration } from '../../typings';
interface Props {
    longWindowDuration: Duration;
    initialDuration?: Duration;
    errors?: string[];
    onChange: (duration: Duration) => void;
}
export declare function ShortWindowDuration({ longWindowDuration, initialDuration, onChange, errors, }: Props): React.JSX.Element;
export {};
