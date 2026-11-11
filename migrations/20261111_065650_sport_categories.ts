import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "sports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"archive_label" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "stories" ADD COLUMN "sport_category_id" integer;
  ALTER TABLE "_stories_v" ADD COLUMN "version_sport_category_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "sports_id" integer;
  CREATE UNIQUE INDEX "sports_name_idx" ON "sports" USING btree ("name");
  CREATE UNIQUE INDEX "sports_archive_label_idx" ON "sports" USING btree ("archive_label");
  CREATE INDEX "sports_updated_at_idx" ON "sports" USING btree ("updated_at");
  CREATE INDEX "sports_created_at_idx" ON "sports" USING btree ("created_at");
  ALTER TABLE "stories" ADD CONSTRAINT "stories_sport_category_id_sports_id_fk" FOREIGN KEY ("sport_category_id") REFERENCES "public"."sports"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_sport_category_id_sports_id_fk" FOREIGN KEY ("version_sport_category_id") REFERENCES "public"."sports"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sports_fk" FOREIGN KEY ("sports_id") REFERENCES "public"."sports"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "stories_sport_category_idx" ON "stories" USING btree ("sport_category_id");
  CREATE INDEX "_stories_v_version_version_sport_category_idx" ON "_stories_v" USING btree ("version_sport_category_id");
  CREATE INDEX "payload_locked_documents_rels_sports_id_idx" ON "payload_locked_documents_rels" USING btree ("sports_id");
  INSERT INTO sports(name, archive_label)
  SELECT min(label), min(label) FROM (
    SELECT sport AS label FROM stories WHERE sport IS NOT NULL AND trim(sport) <> ''
    UNION ALL SELECT version_sport FROM _stories_v WHERE version_sport IS NOT NULL AND trim(version_sport) <> ''
    UNION ALL SELECT label FROM (VALUES ('Horse racing'), ('Speed skating'), ('American football'), ('Marathon (Road Running)'), ('Athletics (Marathon)'), ('Motor Racing (Formula 1)'), ('Basketball'), ('Athletics — Marathon'), ('Ice hockey'), ('Boxing'), ('Athletics (Track)'), ('Baseball'), ('Track & Field'), ('Athletics (Men’s 400 metres)'), ('Athletics (Road Running)')) AS archive_sports(label)
  ) existing GROUP BY lower(trim(label));
  UPDATE stories SET sport_category_id = sports.id FROM sports
    WHERE lower(trim(stories.sport)) = lower(trim(sports.archive_label));
  UPDATE _stories_v SET version_sport_category_id = sports.id FROM sports
    WHERE lower(trim(_stories_v.version_sport)) = lower(trim(sports.archive_label));`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "stories" DROP CONSTRAINT "stories_sport_category_id_sports_id_fk";
  
  ALTER TABLE "_stories_v" DROP CONSTRAINT "_stories_v_version_sport_category_id_sports_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_sports_fk";
  
  DROP INDEX "stories_sport_category_idx";
  DROP INDEX "_stories_v_version_version_sport_category_idx";
  DROP INDEX "payload_locked_documents_rels_sports_id_idx";
  ALTER TABLE "stories" DROP COLUMN "sport_category_id";
  ALTER TABLE "_stories_v" DROP COLUMN "version_sport_category_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "sports_id";
  DROP TABLE "sports";`)
}
