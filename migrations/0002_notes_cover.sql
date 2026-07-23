ALTER TABLE batches ADD COLUMN cover_image_id TEXT REFERENCES images(image_id);
ALTER TABLE batches ADD COLUMN notes TEXT;
ALTER TABLE prompt_groups ADD COLUMN notes TEXT;
