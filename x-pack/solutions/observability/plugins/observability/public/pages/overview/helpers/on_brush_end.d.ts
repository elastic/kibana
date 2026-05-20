import type { XYBrushEvent } from '@elastic/charts';
import type { History } from 'history';
export declare const onBrushEnd: ({ x, history }: {
    x: XYBrushEvent["x"];
    history: History;
}) => void;
