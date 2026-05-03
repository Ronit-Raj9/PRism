import type { PRNode, IssueNode } from "@/types/github";

export type ActivityView = "explorer" | "search" | "timeline" | "insights";

export type TabKind =
  | "overview"
  | "pr"
  | "issue"
  | "search"
  | "timeline"
  | "insights";

export interface Tab {
  id: string;
  kind: TabKind;
  title: string;
  subtitle?: string;
  pr?: PRNode;
  issue?: IssueNode;
}

export function prTabId(pr: PRNode): string {
  return `pr:${pr.repo.nameWithOwner}#${pr.number}`;
}

export function issueTabId(issue: IssueNode): string {
  return `issue:${issue.repo.nameWithOwner}#${issue.number}`;
}
