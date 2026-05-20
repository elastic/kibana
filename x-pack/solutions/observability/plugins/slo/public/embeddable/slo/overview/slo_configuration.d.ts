import React from 'react';
import type { GroupOverviewCustomState, SingleOverviewCustomState } from '../../../../common/embeddables/overview/types';
interface SloConfigurationProps {
    initialInput?: GroupOverviewCustomState;
    onCreate: (props: SingleOverviewCustomState | GroupOverviewCustomState) => void;
    onCancel: () => void;
}
export declare function SloConfiguration({ initialInput, onCreate, onCancel }: SloConfigurationProps): React.JSX.Element;
export {};
