import { z } from "zod";

export const MIN_DECK_SIZE = 40;
export const MAX_DECK_SIZE = 60;
export const DEFAULT_MONTE_CARLO_TRIALS = 100_000;
export const DEFAULT_EXACT_MAX_STATES = 200_000;

export const comparisonOperatorSchema = z.enum(["gte", "lte", "eq"]);
export type ComparisonOperator = z.infer<typeof comparisonOperatorSchema>;

export const cardGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  count: z.int().min(0).max(MAX_DECK_SIZE),
});
export type CardGroup = z.infer<typeof cardGroupSchema>;

export const conditionClauseSchema = z.object({
  id: z.string().min(1),
  groupId: z.string().min(1),
  operator: comparisonOperatorSchema,
  count: z.int().min(0).max(MAX_DECK_SIZE),
});
export type ConditionClause = z.infer<typeof conditionClauseSchema>;

export const conditionSetSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  clauses: z.array(conditionClauseSchema),
});
export type ConditionSet = z.infer<typeof conditionSetSchema>;

const baseSimulatorConfigSchema = z.object({
  deckSize: z.int().min(MIN_DECK_SIZE).max(MAX_DECK_SIZE),
  handSize: z.int().min(1).max(MAX_DECK_SIZE),
  groups: z.array(cardGroupSchema),
  conditionSets: z.array(conditionSetSchema),
});

function refineSimulatorConfig(
  data: z.infer<typeof baseSimulatorConfigSchema>,
  ctx: z.RefinementCtx,
): void {
  if (data.handSize > data.deckSize) {
    ctx.addIssue({
      code: "custom",
      message: "初手枚数はデッキ枚数以下にしてください。",
      path: ["handSize"],
    });
  }

  const groupIds = new Set<string>();
  let totalCards = 0;
  for (const group of data.groups) {
    if (groupIds.has(group.id)) {
      ctx.addIssue({
        code: "custom",
        message: `グループ ID が重複しています: ${group.id}`,
        path: ["groups"],
      });
    }
    groupIds.add(group.id);
    totalCards += group.count;
  }

  if (totalCards > data.deckSize) {
    ctx.addIssue({
      code: "custom",
      message: "カードの合計枚数がデッキ枚数を超えています。",
      path: ["groups"],
    });
  }

  for (const set of data.conditionSets) {
    for (const clause of set.clauses) {
      if (!groupIds.has(clause.groupId)) {
        ctx.addIssue({
          code: "custom",
          message: `存在しないカードの種類を参照しています: ${clause.groupId}`,
          path: ["conditionSets"],
        });
      }
    }
  }
}

export const simulatorConfigSchema = baseSimulatorConfigSchema.superRefine(
  refineSimulatorConfig,
);
export type SimulatorConfig = z.infer<typeof simulatorConfigSchema>;

export const simulatorPresetSchema = baseSimulatorConfigSchema
  .extend({
    id: z.string().min(1),
    name: z.string().trim().min(1),
    updatedAt: z.iso.datetime(),
  })
  .superRefine(refineSimulatorConfig);
export type SimulatorPreset = z.infer<typeof simulatorPresetSchema>;

export type CalculationMethod = "exact" | "monte-carlo";

export interface ConditionSetProbability {
  id: string;
  probability: number;
}

export interface SimulationResult {
  probability: number;
  method: CalculationMethod;
  trials?: number;
  marginOfError?: number;
  conditionSetProbabilities: ConditionSetProbability[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
