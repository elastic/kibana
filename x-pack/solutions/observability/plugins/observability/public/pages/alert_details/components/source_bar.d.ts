import React from 'react';
import type { AlertDetailsSource } from '../types';
import type { TopAlert } from '../../..';
export interface SourceBarProps {
    alert: TopAlert;
    sources?: AlertDetailsSource[];
}
export declare function SourceBar({ alert, sources }: SourceBarProps): false | React.JSX.Element;
export default SourceBar;
