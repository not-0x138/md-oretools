import type { SimulatorConfig } from "./types";

export interface SampleTemplate {
  id: string;
  label: string;
  description: string;
  config: SimulatorConfig;
}

export const SAMPLE_SIMULATOR_TEMPLATES: readonly SampleTemplate[] = [
  {
    id: "standard-40",
    label: "例: 初動12＋誘発12",
    description: "初動1枚以上かつ誘発1枚以上（先攻5枚）",
    config: {
      deckSize: 40,
      handSize: 5,
      groups: [
        { id: "starter", name: "1枚初動", count: 12 },
        { id: "handtrap", name: "手札誘発", count: 12 },
        { id: "garnet", name: "素引きしたくない札", count: 2 },
      ],
      conditionSets: [
        {
          id: "set-starter-ht",
          name: "初動と誘発を1枚ずつ",
          clauses: [
            { id: "c1", groupId: "starter", operator: "gte", count: 1 },
            { id: "c2", groupId: "handtrap", operator: "gte", count: 1 },
          ],
        },
      ],
    },
  },
  {
    id: "two-card-combo",
    label: "例: 1枚初動 or 2枚初動",
    description: "1枚初動を1枚以上、または初動Aと初動Bを1枚ずつ",
    config: {
      deckSize: 40,
      handSize: 5,
      groups: [
        { id: "one-card", name: "1枚初動", count: 9 },
        { id: "combo-a", name: "2枚初動A", count: 6 },
        { id: "combo-b", name: "2枚初動B", count: 6 },
      ],
      conditionSets: [
        {
          id: "set-one",
          name: "1枚初動を引く",
          clauses: [
            { id: "c1", groupId: "one-card", operator: "gte", count: 1 },
          ],
        },
        {
          id: "set-two",
          name: "2枚初動を揃える",
          clauses: [
            { id: "c2", groupId: "combo-a", operator: "gte", count: 1 },
            { id: "c3", groupId: "combo-b", operator: "gte", count: 1 },
          ],
        },
      ],
    },
  },
];
