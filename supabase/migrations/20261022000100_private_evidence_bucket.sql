-- PiperTrace private evidence storage hardening.
-- Safe to re-run: create/update the bucket and recreate only the named owner-scoped policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

drop policy if exists "evidence own read" on storage.objects;
create policy "evidence own read"
on storage.objects for select to authenticated
using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "evidence own write" on storage.objects;
create policy "evidence own write"
on storage.objects for insert to authenticated
with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "evidence own delete" on storage.objects;
create policy "evidence own delete"
on storage.objects for delete to authenticated
using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
