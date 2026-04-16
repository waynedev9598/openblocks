CREATE TABLE "reels_analysis_reels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"shortcode" text,
	"transcript" text,
	"author" text,
	"caption" text,
	"thumbnail_url" text,
	"notes" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'saved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "reels_analysis_reels_shortcode_idx" ON "reels_analysis_reels" USING btree ("shortcode");--> statement-breakpoint
CREATE INDEX "reels_analysis_reels_tags_idx" ON "reels_analysis_reels" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "reels_analysis_reels_status_idx" ON "reels_analysis_reels" USING btree ("status");