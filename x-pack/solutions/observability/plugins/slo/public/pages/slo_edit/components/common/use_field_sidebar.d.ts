import type { SetStateAction } from 'react';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
export declare const useFieldSidebar: ({ dataView, columns, setColumns, }: {
    dataView: DataView;
    columns: string[];
    setColumns: React.Dispatch<SetStateAction<string[]>>;
}) => React.JSX.Element;
