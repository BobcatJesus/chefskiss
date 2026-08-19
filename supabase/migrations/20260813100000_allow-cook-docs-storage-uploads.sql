-- Ensure the cook-docs bucket exists and can be read publicly for menu images.
insert into storage.buckets (id, name, public)
values ('cook-docs', 'cook-docs', true)
on conflict (id) do update set public = excluded.public;

-- Allow anyone to read files from cook-docs (for public meal images).
drop policy if exists "cook docs public read" on storage.objects;
create policy "cook docs public read"
on storage.objects
for select
using (bucket_id = 'cook-docs');

-- Allow signed-in users to upload files only into their own top-level folder.
drop policy if exists "cook docs insert own folder" on storage.objects;
create policy "cook docs insert own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cook-docs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow signed-in users to update files only in their own folder.
drop policy if exists "cook docs update own folder" on storage.objects;
create policy "cook docs update own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'cook-docs'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'cook-docs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow signed-in users to delete files only in their own folder.
drop policy if exists "cook docs delete own folder" on storage.objects;
create policy "cook docs delete own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cook-docs'
  and auth.uid()::text = (storage.foldername(name))[1]
);
