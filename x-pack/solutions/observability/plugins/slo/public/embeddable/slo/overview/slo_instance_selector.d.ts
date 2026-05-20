import React from 'react';
interface Props {
    sloId: string;
    remoteName?: string;
    onSelected: (instanceId: string | undefined) => void;
    hasError?: boolean;
}
export declare function SloInstanceSelector({ sloId, remoteName, onSelected, hasError }: Props): React.JSX.Element;
export {};
