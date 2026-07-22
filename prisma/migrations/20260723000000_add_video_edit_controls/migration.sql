-- Reviewer edit controls on Video (all additive / non-destructive).
ALTER TABLE "Video" ADD COLUMN "subtitlesEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Video" ADD COLUMN "trimStart" INTEGER;
ALTER TABLE "Video" ADD COLUMN "trimEnd" INTEGER;
