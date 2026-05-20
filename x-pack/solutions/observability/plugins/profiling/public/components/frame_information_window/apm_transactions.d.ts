import React from 'react';
interface Props {
    serviceNames: Record<string, number>;
    functionName: string;
}
export declare function APMTransactions({ functionName, serviceNames }: Props): React.JSX.Element;
export {};
