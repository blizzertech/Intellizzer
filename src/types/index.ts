export interface PRDetails {
  owner: string;
  repo: string;
  pull_number: number;
  title: string;
  description: string;
}

export interface ReviewComment {
  body: string;
  path: string;
  line: number;
  commit_id: string;
  diff_hunk: string;
}

export interface AIReviewResponse {
  lineNumber: string;
  reviewComment: string;
}
