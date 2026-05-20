import React from 'react';
import type { Props as FrameInformationWindowProps } from '.';
interface Props extends FrameInformationWindowProps {
    onClose: () => void;
}
export declare function FrameInformationTooltip({ onClose, ...props }: Props): React.JSX.Element;
export {};
