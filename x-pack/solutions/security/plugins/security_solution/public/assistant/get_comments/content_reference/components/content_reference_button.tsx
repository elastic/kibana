import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';

type Props = React.ComponentProps<typeof EuiButtonEmpty> & {
    contentReferenceCount: number
}

export const ContentReferenceButton: React.FC<Props> = ({ contentReferenceCount, ...euiButtonEmptyProps }) => {
    return (
        <EuiButtonEmpty
            size="xs"
            style={{
                padding: 0,
            }}
            contentProps={{
                style: {
                    alignItems: 'start',
                },
            }}
            {...euiButtonEmptyProps}
        >
            <sup>{`[${contentReferenceCount}]`}</sup>
        </EuiButtonEmpty>
    );
}
