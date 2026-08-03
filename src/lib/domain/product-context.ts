export interface OkrEntry {
  objective: string;
  keyResults: string[];
}

export interface ProductContextData {
  productDescription: string;
  goals: string[];
  okrs: OkrEntry[];
  northStarMetric: string;
  supportingMetrics: string[];
  priorityAreas: string[];
  targetSegments: string[];
  constraints: string;
  freeText: string;
}

export const EMPTY_PRODUCT_CONTEXT: ProductContextData = {
  productDescription: "",
  goals: [],
  okrs: [],
  northStarMetric: "",
  supportingMetrics: [],
  priorityAreas: [],
  targetSegments: [],
  constraints: "",
  freeText: "",
};

export function isProductContextComplete(ctx: ProductContextData): boolean {
  return ctx.productDescription.trim().length > 0 && ctx.northStarMetric.trim().length > 0;
}
