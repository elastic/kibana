import type { CursorDirection, SortOrder } from '../../../../../common/runtime_types';
export interface CursorPagination {
    cursorKey?: any;
    cursorDirection: CursorDirection;
    sortOrder: SortOrder;
}
