export interface Review {
  author: string;
  rating: number | null;
  text: string;
  datetime?: string;
  source?: string;
}

export interface Report {
  overall_score: number;
  sentiment_label: string;
  positive_themes: string[];
  negative_themes: string[];
  executive_summary: string;
  recommendations: string[];
  language_detected: string;
  total_reviews_analyzed: number;
}

export interface Msg {
  role: "user" | "assistant";
  content: string;
}

export type State = "setup" | "loading" | "report" | "chat" | "workspace";
