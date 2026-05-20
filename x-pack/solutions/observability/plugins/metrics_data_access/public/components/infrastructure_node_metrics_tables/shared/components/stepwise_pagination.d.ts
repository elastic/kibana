import React from 'react';
interface CursorPaginationProps {
    ariaLabel: string;
    currentPageIndex: number;
    pageCount: number;
    setCurrentPageIndex: (nextPageIndex: number) => void;
}
export declare function StepwisePagination({ ariaLabel, pageCount, currentPageIndex, setCurrentPageIndex, }: CursorPaginationProps): React.JSX.Element;
export {};
