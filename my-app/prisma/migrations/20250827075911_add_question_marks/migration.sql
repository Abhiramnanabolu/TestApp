-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "negativeMarks" DOUBLE PRECISION,
ADD COLUMN     "positiveMarks" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."Section" ADD COLUMN     "defaultNegativeMarks" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN     "defaultPositiveMarks" DOUBLE PRECISION DEFAULT 1.0;
