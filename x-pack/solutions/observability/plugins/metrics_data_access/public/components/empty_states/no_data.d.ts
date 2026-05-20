import React from 'react';
interface NoDataProps {
    titleText: string;
    bodyText: string;
    refetchText: string;
    onRefetch: () => void;
    testString?: string;
}
export declare const NoData: React.FC<NoDataProps>;
export {};
