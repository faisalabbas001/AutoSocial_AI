-- Source video pixel dimensions (additive / non-destructive).
ALTER TABLE "Video" ADD COLUMN "width" INTEGER;
ALTER TABLE "Video" ADD COLUMN "height" INTEGER;
