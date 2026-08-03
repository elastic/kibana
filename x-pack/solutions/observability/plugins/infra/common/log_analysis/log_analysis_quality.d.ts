interface ManyCategoriesWarningReason {
    type: 'manyCategories';
    categoriesDocumentRatio: number;
}
interface ManyDeadCategoriesWarningReason {
    type: 'manyDeadCategories';
    deadCategoriesRatio: number;
}
interface ManyRareCategoriesWarningReason {
    type: 'manyRareCategories';
    rareCategoriesRatio: number;
}
interface NoFrequentCategoriesWarningReason {
    type: 'noFrequentCategories';
}
interface SingleCategoryWarningReason {
    type: 'singleCategory';
}
export type CategoryQualityWarningReason = ManyCategoriesWarningReason | ManyDeadCategoriesWarningReason | ManyRareCategoriesWarningReason | NoFrequentCategoriesWarningReason | SingleCategoryWarningReason;
export type CategoryQualityWarningReasonType = CategoryQualityWarningReason['type'];
export interface CategoryQualityWarning {
    type: 'categoryQualityWarning';
    jobId: string;
    dataset: string;
    reasons: CategoryQualityWarningReason[];
}
export type QualityWarning = CategoryQualityWarning;
export {};
