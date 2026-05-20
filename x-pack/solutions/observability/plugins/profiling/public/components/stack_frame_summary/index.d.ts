import React from 'react';
import type { StackFrameMetadata } from '@kbn/profiling-utils';
interface Props {
    frame: StackFrameMetadata;
    onFrameClick?: (functionName: string) => void;
}
export declare function StackFrameSummary({ frame, onFrameClick }: Props): React.JSX.Element;
export {};
