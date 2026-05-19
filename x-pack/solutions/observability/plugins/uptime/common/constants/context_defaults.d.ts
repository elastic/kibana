import { CursorDirection, SortOrder } from '../runtime_types';
/**
 * The Uptime UI utilizes a settings context, the defaults for which are stored here.
 */
export declare const CONTEXT_DEFAULTS: {
    /**
     * The application cannot assume a basePath.
     */
    BASE_PATH: string;
    CURSOR_PAGINATION: {
        cursorDirection: CursorDirection;
        sortOrder: SortOrder;
    };
};
