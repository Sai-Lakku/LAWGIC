// types/statute.ts

export type RuleVariable = {
  name: string;
  description: string;
};

export type RuleExample = {
  county: string;
  year: number;
};

export type RuleBlock = {
  rule: any;
  variables?: RuleVariable[];
  examples?: RuleExample[];
  consequences?: string[];
};

export type Statute = {
  id?: string;
  title?: string;
  url?: string;
  text?: string;
  rules?: RuleBlock[];
  examples?: RuleExample[];
  variables?: RuleVariable[];
  consequences?: string[];
  keywords?: string[];      // 👈 Add any additional fields used in search
  category?: string;        // 👈 Add this too if you're using it in search
};
