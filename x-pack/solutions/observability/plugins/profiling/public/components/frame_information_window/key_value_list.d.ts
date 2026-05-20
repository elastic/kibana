import React from 'react';
interface Props {
    'data-test-subj'?: string;
    rows: Array<{
        label: string | React.ReactNode;
        value: React.ReactNode;
        'data-test-subj'?: string;
    }>;
}
export declare function KeyValueList({ rows, ...props }: Props): React.JSX.Element;
export {};
