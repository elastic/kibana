import React from 'react';
import type { Duration } from '../../typings';
interface Props {
    initialDuration?: Duration;
    errors?: string[];
    onChange: (duration: Duration) => void;
}
export declare function LongWindowDuration({ initialDuration, onChange, errors }: Props): React.JSX.Element;
export {};
