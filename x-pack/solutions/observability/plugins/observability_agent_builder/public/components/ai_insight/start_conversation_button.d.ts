import React from 'react';
import { type AiButtonProps } from '@kbn/shared-ux-ai-components';
import type { InsightType } from '../../analytics';
type StartConversationButtonProps = AiButtonProps & {
    insightType: InsightType;
};
export declare function StartConversationButton({ insightType, ...props }: StartConversationButtonProps): React.JSX.Element;
export {};
