import React from 'react';
export declare function DatePicker({ start, end, setStart, setEnd, refetch, }: {
    start: string;
    end: string;
    setStart: (val: string) => void;
    setEnd: (val: string) => void;
    refetch: () => void;
}): React.JSX.Element;
