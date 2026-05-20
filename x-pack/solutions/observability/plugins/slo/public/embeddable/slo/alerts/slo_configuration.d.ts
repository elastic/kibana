import React from 'react';
import type { AlertsCustomState } from './types';
interface SloConfigurationProps {
    initialInput?: AlertsCustomState;
    onCreate: (props: AlertsCustomState) => void;
    onCancel: () => void;
}
export declare function SloConfiguration({ initialInput, onCreate, onCancel }: SloConfigurationProps): React.JSX.Element;
export {};
